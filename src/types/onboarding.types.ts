// ── Onboarding Record ─────────────────────────────────────────────────────────

export type OnboardingStatus = 'new' | 'downloaded' | 'done';

export interface IOnboardingRecord {
    _id: string;
    name: string;
    qualification?: string | null;
    dob?: string | null;
    pulse_visit_id?: string | null;
    registration_no?: string | null;
    service_area?: string | null;
    qr_link?: string | null;
    photo_url?: string | null;
    source_app?: string | null;
    status: OnboardingStatus;
    downloaded_at?: string | null;
    done_at?: string | null;
    created_at: string;
    updated_at: string;
}

// ── Field Registry ────────────────────────────────────────────────────────────
// To add a new field in the future:
//   1. Add the field to IOnboardingRecord above
//   2. Add an entry here
//   Everything else (canvas chip, display) is automatic.

export type FieldType = 'text' | 'image' | 'qrcode';

export interface FieldDefinition {
    key: keyof IOnboardingRecord;
    label: string;
    type: FieldType;
}

export const FIELD_REGISTRY: FieldDefinition[] = [
    { key: 'name',            label: 'Full Name',       type: 'text'  },
    { key: 'qualification',   label: 'Qualification',   type: 'text'  },
    { key: 'dob',             label: 'Date of Birth',   type: 'text'  },
    { key: 'pulse_visit_id',  label: 'Pulse Visit ID',  type: 'text'  },
    { key: 'registration_no', label: 'Registration No', type: 'text'  },
    { key: 'service_area',    label: 'Service Area',    type: 'text'  },
    { key: 'qr_link',         label: 'QR Link',         type: 'qrcode'},
    { key: 'photo_url',       label: 'Photo',           type: 'image' },
];

// ── Canvas Field ──────────────────────────────────────────────────────────────

export interface CanvasField {
    id: string;                       // unique per placed field
    type: FieldType;
    fieldKey: keyof IOnboardingRecord;
    label: string;
    // Position on canvas (as % of template dimensions for scale-independence)
    xPct: number;
    yPct: number;
    // Text styling (for type: 'text')
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    // Image sizing (for type: 'image') — as % of template dimensions
    widthPct?: number;
    heightPct?: number;
}

// ── API Response shapes ───────────────────────────────────────────────────────

export interface OnboardingListResponse {
    records: IOnboardingRecord[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}
