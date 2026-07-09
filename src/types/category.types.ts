export interface DynamicQRCategory {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    in_use?: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateDynamicQRCategoryPayload {
    name: string;
    slug?: string;
    description?: string;
}

export interface UpdateDynamicQRCategoryPayload {
    name?: string;
    slug?: string;
    description?: string;
}
