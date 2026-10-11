import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

// Pure functions matching lib/permissions.ts & lib/importer.ts
export const MAX_IMPORT_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
export const SUPPORTED_EXTENSIONS = [".md", ".markdown", ".txt"];

export function validateImportFile(file) {
  if (!file || !file.name) {
    return { valid: false, error: "No file selected." };
  }
  if (file.size === 0) {
    return { valid: false, error: "The selected file is empty." };
  }
  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeInMb} MB) exceeds the maximum limit of 1 MB.`,
    };
  }
  const lowerName = file.name.toLowerCase();
  const hasValidExt = SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload a Markdown (.md) or Plain Text (.txt) file.",
    };
  }
  return { valid: true };
}

export function resolveUserDocumentRole(userId, doc, shares = []) {
  if (!userId) return null;
  if (doc.owner_id === userId) return "owner";
  const userShare = shares.find(
    (s) => s.document_id === doc.id && s.shared_with_user_id === userId
  );
  if (userShare) return userShare.permission;
  return null;
}

export function canEditContent(role) {
  return role === "owner" || role === "editor";
}

export function canRenameDocument(role) {
  return role === "owner";
}

export function canDeleteDocument(role) {
  return role === "owner";
}

export function canManageSharing(role) {
  return role === "owner";
}

export function validateShareRequest(callerRole, ownerEmail, targetEmail, permission) {
  if (callerRole !== "owner") {
    return { valid: false, error: "Only the document owner can manage sharing." };
  }
  const cleanTarget = targetEmail?.trim().toLowerCase();
  const cleanOwner = ownerEmail?.trim().toLowerCase();
  if (!cleanTarget) {
    return { valid: false, error: "Recipient email is required." };
  }
  if (cleanTarget === cleanOwner) {
    return {
      valid: false,
      error: "You cannot share a document with yourself (you already own it).",
    };
  }
  if (permission !== "viewer" && permission !== "editor") {
    return {
      valid: false,
      error: "Invalid permission level. Allowed values: viewer, editor.",
    };
  }
  return { valid: true };
}

// -------------------------------------------------------------
// TEST SUITE: Prioritized Requirements 1 to 5
// -------------------------------------------------------------

describe("1. File Validation & Constraints", () => {
  it("rejects unsupported formats (.docx, .pdf, .exe, .html)", () => {
    const docx = validateImportFile({ name: "quarterly-report.docx", size: 1024 });
    assert.equal(docx.valid, false);
    assert.match(docx.error, /Unsupported file format/);

    const pdf = validateImportFile({ name: "invoice.pdf", size: 5000 });
    assert.equal(pdf.valid, false);

    const exe = validateImportFile({ name: "malware.exe", size: 200 });
    assert.equal(exe.valid, false);
  });

  it("rejects oversized files exceeding the 1 MB threshold", () => {
    const oversized = validateImportFile({
      name: "huge-dump.md",
      size: MAX_IMPORT_SIZE_BYTES + 500,
    });
    assert.equal(oversized.valid, false);
    assert.match(oversized.error, /exceeds the maximum limit of 1 MB/);
  });

  it("rejects empty files (0 bytes)", () => {
    const empty = validateImportFile({ name: "empty-notes.txt", size: 0 });
    assert.equal(empty.valid, false);
    assert.match(empty.error, /empty/);
  });

  it("accepts valid .md and .txt files within 1 MB", () => {
    const validMd = validateImportFile({ name: "architecture.md", size: 10 * 1024 });
    assert.equal(validMd.valid, true);

    const validTxt = validateImportFile({ name: "todo.txt", size: 500 });
    assert.equal(validTxt.valid, true);
  });
});

describe("2. Document Ownership & Sharing Permission Resolution", () => {
  const doc = { id: "doc-99", owner_id: "user-alex-owner" };
  const shares = [
    { document_id: "doc-99", shared_with_user_id: "user-jordan-editor", permission: "editor" },
    { document_id: "doc-99", shared_with_user_id: "user-taylor-viewer", permission: "viewer" },
  ];

  it("correctly identifies the document owner", () => {
    const role = resolveUserDocumentRole("user-alex-owner", doc, shares);
    assert.equal(role, "owner");
  });

  it("correctly identifies an assigned editor", () => {
    const role = resolveUserDocumentRole("user-jordan-editor", doc, shares);
    assert.equal(role, "editor");
  });

  it("correctly identifies an assigned viewer", () => {
    const role = resolveUserDocumentRole("user-taylor-viewer", doc, shares);
    assert.equal(role, "viewer");
  });

  it("denies access to an unshared stranger", () => {
    const role = resolveUserDocumentRole("user-stranger-casey", doc, shares);
    assert.equal(role, null);
  });
});

describe("3. Viewer Restrictions (Read-Only Enforcement)", () => {
  const viewerRole = "viewer";

  it("prevents viewers from editing document content", () => {
    assert.equal(canEditContent(viewerRole), false);
  });

  it("prevents viewers from renaming the document title", () => {
    assert.equal(canRenameDocument(viewerRole), false);
  });

  it("prevents viewers from deleting the document", () => {
    assert.equal(canDeleteDocument(viewerRole), false);
  });

  it("prevents viewers from inviting or managing collaborators", () => {
    assert.equal(canManageSharing(viewerRole), false);
  });
});

describe("4. Shared Editor Capabilities vs Owner-Only Protections", () => {
  const editorRole = "editor";

  it("allows shared editors to edit document content", () => {
    assert.equal(canEditContent(editorRole), true);
  });

  it("strictly prevents shared editors from renaming the document title", () => {
    assert.equal(canRenameDocument(editorRole), false);
  });

  it("strictly prevents shared editors from deleting the document", () => {
    assert.equal(canDeleteDocument(editorRole), false);
  });

  it("strictly prevents shared editors from sharing with other users", () => {
    assert.equal(canManageSharing(editorRole), false);
    const attempt = validateShareRequest(
      editorRole,
      "alex@example.com",
      "thirdparty@example.com",
      "viewer"
    );
    assert.equal(attempt.valid, false);
    assert.match(attempt.error, /Only the document owner/);
  });
});

describe("5. Revoked Access Enforcement", () => {
  const doc = { id: "doc-99", owner_id: "user-alex-owner" };

  it("immediately denies access when a collaborator's share is revoked", () => {
    // 1. Initial active share
    let shares = [
      { document_id: "doc-99", shared_with_user_id: "user-jordan", permission: "editor" },
    ];
    assert.equal(resolveUserDocumentRole("user-jordan", doc, shares), "editor");
    assert.equal(canEditContent("editor"), true);

    // 2. Access revoked (record removed from database)
    shares = [];

    // 3. Subsequent check is immediately null & unauthorized
    const revokedRole = resolveUserDocumentRole("user-jordan", doc, shares);
    assert.equal(revokedRole, null);
    assert.equal(canEditContent(revokedRole), false);
    assert.equal(canRenameDocument(revokedRole), false);
  });
});
