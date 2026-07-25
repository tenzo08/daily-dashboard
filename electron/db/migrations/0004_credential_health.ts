// Separate secret_updated_at from updated_at so renaming a credential (or
// changing its username/folder/url) doesn't reset the "password age" used
// by the vault health check — only an actual password change should.
export const migration_0004_credential_health = `
ALTER TABLE credentials ADD COLUMN secret_updated_at TEXT;
UPDATE credentials SET secret_updated_at = updated_at WHERE secret_updated_at IS NULL;
`
