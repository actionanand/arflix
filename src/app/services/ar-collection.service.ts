import { Service, inject } from '@angular/core';

import { environment } from '../../environments/environment';
import { ArCollectionItem, ArCollectionRow } from '../models/ar-collection';
import { MediaType } from '../models/tmdb';
import { TmdbService } from './tmdb.service';

interface GvizCell {
  f?: string;
  v?: unknown;
}

interface GvizRow {
  c?: (GvizCell | null)[];
}

interface GvizResponse {
  table?: {
    rows?: GvizRow[];
  };
}

@Service()
export class ArCollectionService {
  private readonly tmdb = inject(TmdbService);
  private readonly sheetId = environment.GOOGLE_SHEET_ID;
  private readonly sheetGid = environment.SHEET_GID;

  async getMediaForRows(
    rows: ArCollectionRow[],
    abortSignal?: AbortSignal,
  ): Promise<ArCollectionItem[]> {
    return Promise.all(
      rows.map(async (row) => ({
        sheet: row,
        media: await this.findMedia(row, abortSignal),
      })),
    );
  }

  async getSheetRows(abortSignal?: AbortSignal): Promise<ArCollectionRow[]> {
    const url = new URL(`https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq`);
    url.searchParams.set('tqx', 'out:json');
    url.searchParams.set('gid', String(this.sheetGid));

    const response = await fetch(url, {
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`AR collection sheet request failed with status ${response.status}`);
    }

    return this.toCollectionRows(this.parseGvizResponse(await response.text()));
  }

  private async findMedia(
    row: ArCollectionRow,
    abortSignal?: AbortSignal,
  ): Promise<ArCollectionItem['media']> {
    try {
      if (row.tmdbId) {
        return await this.tmdb.getTitleInfoById(
          this.typeForTmdbId(row.type),
          row.tmdbId,
          abortSignal,
        );
      }

      return await this.tmdb.findTitleInfo(row.title, this.typeHint(row.type), abortSignal);
    } catch {
      return null;
    }
  }

  private parseGvizResponse(text: string): GvizResponse {
    const objectStart = text.indexOf('{');
    const objectEnd = text.lastIndexOf('}');

    if (objectStart < 0 || objectEnd <= objectStart) {
      throw new Error('AR collection sheet returned an unexpected response');
    }

    return JSON.parse(text.slice(objectStart, objectEnd + 1)) as GvizResponse;
  }

  private toCollectionRows(response: GvizResponse): ArCollectionRow[] {
    return (response.table?.rows ?? [])
      .map((row, index) => ({
        row,
        sheetRowNumber: index + 1,
      }))
      .filter((entry) => this.cellText(entry.row, 0))
      .filter((entry) => !this.isHeaderRow(entry.row))
      .map((entry) => ({
        serialNumber: this.cellText(entry.row, 0),
        sheetRowNumber: entry.sheetRowNumber,
        title: this.cellText(entry.row, 1),
        type: this.cellText(entry.row, 2),
        platform: this.cellText(entry.row, 3),
        language: this.cellText(entry.row, 4),
        category: this.cellText(entry.row, 5) || 'Normal',
        isAdult: this.cellText(entry.row, 6) || 'No',
        comment: this.cellText(entry.row, 7),
        tmdbId: this.cellNumber(entry.row, 8),
      }))
      .filter((row) => row.title);
  }

  private cellText(row: GvizRow, index: number): string {
    const cell = row.c?.[index];

    if (!cell) {
      return '';
    }

    if (typeof cell.f === 'string') {
      return cell.f.trim();
    }

    return cell.v === undefined || cell.v === null ? '' : String(cell.v).trim();
  }

  private cellNumber(row: GvizRow, index: number): number | null {
    const value = Number(this.cellText(row, index).replaceAll(',', ''));

    return Number.isInteger(value) && value > 0 ? value : null;
  }

  private isHeaderRow(row: GvizRow): boolean {
    return (
      this.cellText(row, 0).toLowerCase() === 's no' ||
      this.cellText(row, 1).toLowerCase() === 'title'
    );
  }

  private typeHint(type: string): MediaType | 'all' {
    const normalized = type.toLowerCase();

    if (normalized.includes('movie') || normalized.includes('film')) {
      return 'movie';
    }

    if (
      normalized.includes('series') ||
      normalized.includes('serial') ||
      normalized.includes('show') ||
      normalized.includes('tv') ||
      normalized.includes('web')
    ) {
      return 'tv';
    }

    return 'all';
  }

  private typeForTmdbId(type: string): MediaType {
    return this.typeHint(type) === 'movie' ? 'movie' : 'tv';
  }
}
