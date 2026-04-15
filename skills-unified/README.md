# skills-unified — Consolidation summary

Generated: 2026-04-15T23:21:22Z

This folder is the canonical, unified copy of discovered local Copilot skills in this workspace. It was created by an automated consolidation process.

Key facts
- Centralized reference bundles: 205 (skills-unified/references-central/)
- Unified skill directories (top-level): 953
- Total size of skills-unified/: ~44M

Backups and artifacts
- Backup archive (originals): skills-unified/_backup_originals_20260415T232545Z.tar.gz (4.4M)
- Backup of per-skill references (pre-centralization): skills-unified/_backup_references_20260415T163308Z/
- Delete list (paths archived/deleted): skills-unified/_delete_list_20260415T232545Z.txt
- Manifest mapping (source → dest): skills-unified/MANIFEST.json
- Central references index: skills-unified/references-central/INDEX.md

Actions performed
1. Scanned workspace for local skill packages (heuristic: SKILL.md / skill folders under .agents/.agent/.claude/.cline/.vibe and other common locations).
2. Computed deterministic content hashes and copied one representative per unique hash into skills-unified/.
3. Centralized per-skill `references` folders into skills-unified/references-central/ (deduped), backed up originals, and replaced originals with relative symlinks.
4. Created skills-unified/references-central/INDEX.md listing centralized bundles.
5. Created a backup archive of original skill directories and removed duplicate originals (3,460 paths removed). The backup archive above contains the originals.

Restore / revert
- To restore originals from the archive:
  1. cd <workspace root>
  2. tar -xzf skills-unified/_backup_originals_20260415T232545Z.tar.gz -C .
- To restore per-skill references from the references backup:
  1. Copy desired folder from skills-unified/_backup_references_20260415T163308Z/<skill>/ back to its original path and remove the symlink.

Next steps (suggestions)
- Review skills-unified/ and MANIFEST.json to confirm everything you expect is present.
- Commit skills-unified/ and MANIFEST.json into version control (recommended: create a branch and open a PR).
- When confident, delete the backup archive to reclaim space.

If you want me to perform any of these next steps (commit, remove backup, or revert changes), tell me which and I will proceed.
