import type { ID } from '../model/types';

export const ARCHIVE_EXTENSION = 'mangaka';

export async function exportProjectArchive(_projectId: ID): Promise<string> {
  throw new Error('Chưa hỗ trợ xuất dự án.');
}

export async function importProjectArchive(_archivePath: string): Promise<ID> {
  throw new Error('Chưa hỗ trợ nhập dự án.');
}
