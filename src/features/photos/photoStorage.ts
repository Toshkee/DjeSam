import { Directory, File, Paths } from 'expo-file-system';

import { createId } from '@/lib/singleFlight';

/**
 * Parking photos live in <documents>/photos and are referenced by file name only:
 * the absolute container path can change between app updates on iOS.
 */
function photosDir(): Directory {
  return new Directory(Paths.document, 'photos');
}

function ensureDir(): Directory {
  const dir = photosDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function extensionOf(uri: string): string {
  const match = /\.(jpe?g|png|heic|heif|webp)(?:\?|$)/i.exec(uri);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

/** Copies a temporary camera/picker image into app storage and returns its file name. */
export async function storePhoto(sourceUri: string): Promise<string> {
  const dir = ensureDir();
  const name = `${createId()}.${extensionOf(sourceUri)}`;
  const target = new File(dir, name);
  await new File(sourceUri).copy(target);
  return name;
}

/** URI for display, or null when the file has gone missing (e.g. restored backup without files). */
export function photoUri(fileName: string | null): string | null {
  if (!fileName) return null;
  try {
    const file = new File(photosDir(), fileName);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/** Best effort: a missing file is not an error. */
export function deletePhoto(fileName: string | null): void {
  if (!fileName) return;
  try {
    const file = new File(photosDir(), fileName);
    if (file.exists) file.delete();
  } catch {
    // Ignore — an orphaned file is cleaned up by `removeOrphanedPhotos` on a later start.
  }
}

export function deletePhotos(fileNames: Iterable<string>): void {
  for (const name of fileNames) deletePhoto(name);
}

/** Removes photo files that no session references (interrupted saves, crashed deletes). */
export function removeOrphanedPhotos(referenced: Set<string>): number {
  const dir = photosDir();
  if (!dir.exists) return 0;
  let removed = 0;
  for (const entry of dir.list()) {
    if (entry instanceof File && !referenced.has(entry.name)) {
      try {
        entry.delete();
        removed += 1;
      } catch {
        // Keep going; a locked file will be retried next launch.
      }
    }
  }
  return removed;
}

export function deleteAllPhotos(): void {
  const dir = photosDir();
  try {
    if (dir.exists) dir.delete();
  } catch {
    // Ignore; individual files will be reported missing and handled gracefully.
  }
}
