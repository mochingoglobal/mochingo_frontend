// ─── Dynamic QR Types ─────────────────────────────────────────────────────────

export type DynamicQRStatus = 'assigned' | 'unassigned' | 'disabled';
export type DynamicQRStatusWithMixed = DynamicQRStatus | 'missing' | 'mixed';

export interface DynamicQR {
    _id: string;
    token: string;
    label: string;
    group_id: string | null;
    batch_id: string | null;
    batch_label: string | null;
    batch_size: number | null;
    batch_sequence: number | null;
    status: DynamicQRStatus;
    manual_redirect_url: string | null;
    id_value: string | null;
    qr_url: string;
    resolved_url: string;
    assignment_summary: string;
    scan_count: number;
    last_scanned_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface DynamicQRGroupInventoryItem {
    item_type: 'batch';
    batch_id: string;
    label: string;
    qr_count: number;
    assigned_count: number;
    unassigned_count: number;
    disabled_count: number;
    status: DynamicQRStatusWithMixed;
    assignment_summary: string;
    matched_qr_id: string | null;
    matched_qr_label: string | null;
    matched_qr_token: string | null;
    matched_qr_sequence: number | null;
    matched_manual_redirect_url: string | null;
    matched_dynamic_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface BatchResponse {
    batch_id: string;
    batch_label: string;
    category_id?: string | null;
    qr_count: number;
    filtered_count: number;
    dynamic_qrs: DynamicQR[];
}

export interface ListDynamicQRsResponse {
    dynamic_qrs: DynamicQRGroupInventoryItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface ResolveQRResponse {
    token: string;
    status: DynamicQRStatusWithMixed;
    redirect_url: string;
}

// ─── Query Param (for apply-template) ────────────────────────────────────────

export interface QueryParamTemplate {
    key: string;
    value: string;
    is_dynamic?: boolean;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateDynamicQRPayload {
    label: string;
    count: number;
    start_from: number;
    manual_redirect_url?: string | null;
    category_id?: string | null;
    param_name?: string;
    value_prefix?: string;
    value_separator?: string;
}

export interface UpdateDynamicQRPayload {
    label?: string;
    status?: DynamicQRStatus;
    manual_redirect_url?: string | null;
    id_value?: string | null;
}

export interface ApplyTemplatePayload {
    source_dynamic_qr_id: string;
    manual_redirect_url?: string | null;
    base_manual_redirect_url?: string;
    query_params?: QueryParamTemplate[];
    id_value?: string | null;
    range_start?: number | null;
    range_end?: number | null;
}

export interface ScanAssignPayload {
    token: string;
    manual_redirect_url: string;
    id_value?: string | null;
    replace_existing?: boolean;
}
