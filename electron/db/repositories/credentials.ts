import type { DB } from '../index'
import type { CredentialRow, CredentialSummary, EncryptedSecret, NewCredentialRow } from '../types'

interface CredentialTableRow {
  id: number
  title: string
  username: string | null
  url: string | null
  folder: string | null
  secret_cipher: string
  secret_iv: string
  secret_tag: string
  created_at: string
  updated_at: string
  secret_updated_at: string
}

function mapRow(row: CredentialTableRow): CredentialRow {
  return {
    id: row.id,
    title: row.title,
    username: row.username,
    url: row.url,
    folder: row.folder,
    secretCipher: row.secret_cipher,
    secretIv: row.secret_iv,
    secretTag: row.secret_tag,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    secretUpdatedAt: row.secret_updated_at
  }
}

function mapSummary(row: CredentialTableRow): CredentialSummary {
  return {
    id: row.id,
    title: row.title,
    username: row.username,
    url: row.url,
    folder: row.folder,
    updatedAt: row.updated_at
  }
}

// Repository only ever handles the encrypted blob — see types.ts's comment.
// Passwords never pass through here in plaintext.
export function createCredentialsRepository(db: DB) {
  const insertStmt = db.prepare(`
    INSERT INTO credentials (title, username, url, folder, secret_cipher, secret_iv, secret_tag, secret_updated_at)
    VALUES (@title, @username, @url, @folder, @secretCipher, @secretIv, @secretTag, datetime('now'))
  `)
  const getStmt = db.prepare(`SELECT * FROM credentials WHERE id = ?`)
  const listStmt = db.prepare(`SELECT * FROM credentials ORDER BY title COLLATE NOCASE`)
  const updateMetaStmt = db.prepare(`
    UPDATE credentials
    SET title = @title, username = @username, url = @url, folder = @folder, updated_at = datetime('now')
    WHERE id = @id
  `)
  const updateSecretStmt = db.prepare(`
    UPDATE credentials
    SET secret_cipher = @secretCipher, secret_iv = @secretIv, secret_tag = @secretTag,
        updated_at = datetime('now'), secret_updated_at = datetime('now')
    WHERE id = @id
  `)
  const rekeySecretStmt = db.prepare(`
    UPDATE credentials SET secret_cipher = @secretCipher, secret_iv = @secretIv, secret_tag = @secretTag WHERE id = @id
  `)
  const deleteStmt = db.prepare(`DELETE FROM credentials WHERE id = ?`)

  return {
    list(): CredentialSummary[] {
      return (listStmt.all() as CredentialTableRow[]).map(mapSummary)
    },

    listAll(): CredentialRow[] {
      return (listStmt.all() as CredentialTableRow[]).map(mapRow)
    },

    get(id: number): CredentialRow | undefined {
      const row = getStmt.get(id) as CredentialTableRow | undefined
      return row ? mapRow(row) : undefined
    },

    create(input: NewCredentialRow): CredentialSummary {
      const result = insertStmt.run({
        title: input.title,
        username: input.username ?? null,
        url: input.url ?? null,
        folder: input.folder ?? null,
        secretCipher: input.secretCipher,
        secretIv: input.secretIv,
        secretTag: input.secretTag
      })
      return mapSummary(getStmt.get(result.lastInsertRowid) as CredentialTableRow)
    },

    updateMeta(
      id: number,
      patch: { title?: string; username?: string | null; url?: string | null; folder?: string | null }
    ): CredentialSummary {
      const current = getStmt.get(id) as CredentialTableRow
      updateMetaStmt.run({
        id,
        title: patch.title ?? current.title,
        username: patch.username !== undefined ? patch.username : current.username,
        url: patch.url !== undefined ? patch.url : current.url,
        folder: patch.folder !== undefined ? patch.folder : current.folder
      })
      return mapSummary(getStmt.get(id) as CredentialTableRow)
    },

    /** Bumps secret_updated_at — an actual password change, not just a rename. */
    updateSecret(id: number, secret: EncryptedSecret): void {
      updateSecretStmt.run({ id, ...secret })
    },

    /** Used only by the PIN-change re-encryption pass — same password, new key, so secret_updated_at is untouched. */
    rekeySecret(id: number, secret: EncryptedSecret): void {
      rekeySecretStmt.run({ id, ...secret })
    },

    delete(id: number): void {
      deleteStmt.run(id)
    }
  }
}

export type CredentialsRepository = ReturnType<typeof createCredentialsRepository>
