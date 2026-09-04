/* ------------------------------- cosmos -------------------------------- */

export type BodyKind = 'star' | 'planet' | 'dwarf' | 'nebula' | 'hole' | 'vault';
export type Meaning = 'memory' | 'dream' | 'person' | 'project' | 'moment' | 'idea' | 'chapter' | 'unresolved' | null;

export const MEANING_LABEL: Record<string, string> = {
  memory: 'memory', dream: 'dream', person: 'person', project: 'project',
  moment: 'moment', idea: 'idea', chapter: 'chapter', unresolved: 'unresolved',
};

export const MEANINGS: { id: Exclude<Meaning, null>; desc: string; color: string }[] = [
  { id: 'memory', desc: 'something that happened and stays', color: '#7fc4e8' },
  { id: 'dream', desc: 'a night-logic, unverified', color: '#b49ae8' },
  { id: 'person', desc: 'someone this world is about', color: '#f2a0b0' },
  { id: 'project', desc: 'work in motion', color: '#f2c178' },
  { id: 'moment', desc: 'brief, bright, gone', color: '#e0785a' },
  { id: 'idea', desc: 'a seed, not yet a planet', color: '#9fd8a8' },
  { id: 'chapter', desc: 'an era of the life', color: '#d8b48a' },
  { id: 'unresolved', desc: 'still falling inward', color: '#8b93a8' },
];

export interface Palette { deep: string; base: string; high: string; atmo: string; ice: string; }

export interface Orbit { a: number; speed: number; phase: number; incl: number; }

export interface CosmicBody {
  id: string;
  name: string;
  kind: BodyKind;
  meaning: Meaning;
  note: string;
  createdAt: number;
  radius: number;
  rings?: boolean;
  clouds?: boolean;
  nightside?: boolean;
  palette: Palette;
  orbit: Orbit;
}

export interface Connection { id: string; a: string; b: string; createdAt: number; }

/* ------------------------------- diary --------------------------------- */

export type Mood = 'calm' | 'warm' | 'bright' | 'heavy' | 'burning';
export type Weather = 'clear' | 'rain' | 'storm' | 'fog' | 'dust';

export interface Attachment {
  id: string;
  kind: 'image' | 'audio' | 'video' | 'file' | 'code';
  name: string;
  dataUrl: string;
  isGif?: boolean;
  peaks?: number[];
  duration?: number;
  size?: number;
  fileExt?: string;
  codeSnippet?: string;
  lineCount?: number;
  mimeType?: string;
  /* freeform position on the page — glued exactly where you drag it.
     x is % of the page width, y is px down from the top of the page.
     w is % width; h (px) only applies to voice memos. */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  /* finishing touches */  tone?: string;   /* '' | 'noir' | 'warm' | 'fade' — photo grading */
  tilt?: boolean;  /* hand-placed slight rotation */
  /* sealed INTO the paper: occupies its area inline like a typed sentence.
     false/undefined = free-floating plate you drag anywhere. */
  glued?: boolean;
}

export interface DiaryEntry {
  id: string;
  planetId: string;
  title: string;
  body: string;
  tags: string[];
  bookmarked: boolean;
  archived: boolean;
  mood?: Mood;
  weather?: Weather;
  createdAt: number;
  updatedAt: number;
  attachments: Attachment[];
}

/* ------------------------------- vault --------------------------------- */

export type VaultKind = 'document' | 'image' | 'audio' | 'video' | 'dataset' | 'archive' | 'iso' | 'exe' | 'application' | 'game' | 'other';

export interface BtrfsSubvolume {
  id: string;
  name: string;              /* e.g. "@root", "@realities", "@snapshots", "@home" */
  path: string;              /* root mount point, e.g. "/" or "/subvolumes/@realities" */
  rootId: number;            /* btrfs tree root id (e.g. 5 for @root, 256+ for user subvolumes) */
  generation: number;        /* CoW transaction generation ID */
  createdAt: number;
  readOnly?: boolean;
  isSnapshot?: boolean;
  sourceSubvolId?: string;
  flags?: string[];
}

export interface BtrfsSnapshot {
  id: string;
  name: string;
  subvolId: string;
  generation: number;
  createdAt: number;
  fileCount: number;
  totalBytes: number;
  filesSnapshot: VaultFile[];
  foldersSnapshot: string[];
  readOnly: boolean;
  description?: string;
}

export interface BtrfsScrubReport {
  lastScrubAt: number;
  filesScanned: number;
  bytesScanned: number;
  errorsFound: number;
  errorsCorrected: number;
  durationMs: number;
  status: 'clean' | 'repaired' | 'corrupted' | 'running' | 'idle';
  log?: string[];
}

export interface BtrfsSuperblock {
  uuid: string;
  label: string;
  generation: number;
  sectorSize: number;
  nodeSize: number;
  compression: 'zstd' | 'lzo' | 'zlib' | 'none';
  compressionLevel?: number;
  totalBytes: number;
  usedBytes: number;
  cowReflinkCount: number;
  spaceSavingsBytes: number;
}

export interface VaultFile {
  id: string;
  name: string;
  folder: string;            /* absolute FS path, e.g. "/documents/research" */
  kind: VaultKind;
  mime: string;
  size: number;
  addedAt: number;
  content?: string;          /* inline payload when the browser can hold it */
  payloadRef?: string;       /* large payload lives in IndexedDB under this key */
  thumb?: string;            /* tiny inline preview for IndexedDB-backed images */
  sealed?: boolean;          /* payload lives in the execution layer only */
  lock?: string;             /* per-object password (plaintext is never stored) */
  versions?: FileVersion[];  /* edit history for inline-payload objects */
  realityId?: string;        /* reality continuum id this vault file belongs to */
  
  /* Btrfs CoW & metadata extensions */
  subvol?: string;           /* subvolume id or name (defaults to '@root') */
  csum?: string;             /* Btrfs CRC32C / SHA-256 data integrity checksum */
  csumAlgorithm?: 'crc32c' | 'sha256' | 'xxhash64';
  generation?: number;       /* Btrfs CoW transaction generation */
  isReflink?: boolean;       /* CoW clone created via cp --reflink (shares extents) */
  sourceFileId?: string;     /* original file ID if CoW reflink cloned */
  compression?: 'zstd' | 'lzo' | 'none';
  compressedSize?: number;   /* compressed on-disk footprint in bytes */
}

export interface FileVersion {
  id: string;
  savedAt: number;
  label: string;
  size: number;
  content?: string;
  generation?: number;
  csum?: string;
}

export interface TrashedFile {
  item: VaultFile;
  deletedAt: number;
}

export interface AvatarFit { zoom: number; px: number; py: number; }

export interface VaultUser {
  id: string;
  name: string;
  avatar: string | null;
  avatarFrames?: string[] | null;
  avatarFps?: number | null;
  avatarFit?: AvatarFit | null;
  avatarNote?: string | null;
  createdAt: number;
  lastSeen: number;
  salt: string;
  verifier: string;
  kdfRounds?: number;
}

export interface PasswordRecord {
  id: string;
  label: string;
  user: string;
  secret: string;
  category?: string;
  notes?: string;
  updatedAt: number;
}

export interface VaultSecrets { salt: string; iv: string; data: string; rounds?: number; }

export interface AuditEntry { t: number; msg: string; }

/* ------------------------------ universe ------------------------------- */

export interface UniverseState {
  activeRealityId?: string;
  customRealityDescriptions?: Record<string, string>;
  customRealities?: any[];
  deletedRealityIds?: string[];
  bodies: CosmicBody[];
  entries: DiaryEntry[];
  connections: Connection[];
  vault: VaultFile[];
  vaultFolders: string[];    /* explicit folders of the file system */
  vaultTrash: TrashedFile[]; /* released matter lingers here before the final purge */
  vaultUsers: VaultUser[];
  secrets: VaultSecrets | null;
  audit: AuditEntry[];
  visitedAt: number;
  version?: number;          /* migration marker — bumped when stored data needs a one-time fix */

  /* Btrfs File System State */
  btrfsSubvolumes?: BtrfsSubvolume[];
  btrfsSnapshots?: BtrfsSnapshot[];
  btrfsScrub?: BtrfsScrubReport;
  btrfsSuperblock?: BtrfsSuperblock;
  activeSubvolId?: string;
}

export interface TimelineEvent { t: number; label: string; kind: 'body' | 'entry' | 'link' | 'vault'; refId: string; }
