
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"field_definitions": {
                  Row: {
                    "category_id": string,"created_at": string,"help_text": string | null,"id": string,"is_active": boolean,"is_filterable": boolean,"key": string,"label": string,"max": number | null,"min": number | null,"options": NonNullable<Json>,"required": boolean,"sort_order": number,"type": Database["public"]['Enums']["field_type"],"unit": string | null,"updated_at": string
                  }
                  Insert: {
                    "category_id": string,"created_at"?: string,"help_text"?: string | null,"id"?: string,"is_active"?: boolean,"is_filterable"?: boolean,"key": string,"label": string,"max"?: number | null,"min"?: number | null,"options"?: NonNullable<Json>,"required"?: boolean,"sort_order"?: number,"type": Database["public"]['Enums']["field_type"],"unit"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"help_text"?: string | null,"id"?: string,"is_active"?: boolean,"is_filterable"?: boolean,"key"?: string,"label"?: string,"max"?: number | null,"min"?: number | null,"options"?: NonNullable<Json>,"required"?: boolean,"sort_order"?: number,"type"?: Database["public"]['Enums']["field_type"],"unit"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "field_definitions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"items": {
                  Row: {
                    "attributes": NonNullable<Json>,"category_id": string,"created_at": string,"currency": string,"description": string | null,"id": string,"image_path": string | null,"is_hidden_by_admin": boolean,"is_published": boolean,"price": number | null,"provider_id": string,"title": string,"updated_at": string
                  }
                  Insert: {
                    "attributes"?: NonNullable<Json>,"category_id": string,"created_at"?: string,"currency"?: string,"description"?: string | null,"id"?: string,"image_path"?: string | null,"is_hidden_by_admin"?: boolean,"is_published"?: boolean,"price"?: number | null,"provider_id"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "attributes"?: NonNullable<Json>,"category_id"?: string,"created_at"?: string,"currency"?: string,"description"?: string | null,"id"?: string,"image_path"?: string | null,"is_hidden_by_admin"?: boolean,"is_published"?: boolean,"price"?: number | null,"provider_id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "items_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    }
                  ]
                },"provider_private": {
                  Row: {
                    "address": string | null,"created_at": string,"date_of_birth": string | null,"full_legal_name": string | null,"national_id": string | null,"phone_private": string | null,"provider_id": string,"updated_at": string
                  }
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"full_legal_name"?: string | null,"national_id"?: string | null,"phone_private"?: string | null,"provider_id": string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"full_legal_name"?: string | null,"national_id"?: string | null,"phone_private"?: string | null,"provider_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_private_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: true
      referencedRelation: "providers"
      referencedColumns: ["id"]
    }
                  ]
                },"providers": {
                  Row: {
                    "category_id": string | null,"city": string | null,"created_at": string,"description": string | null,"display_name": string,"id": string,"phone_public": string | null,"status": Database["public"]['Enums']["provider_status"],"status_changed_at": string | null,"status_note": string | null,"status_seen_at": string | null,"updated_at": string
                  }
                  Insert: {
                    "category_id"?: string | null,"city"?: string | null,"created_at"?: string,"description"?: string | null,"display_name": string,"id": string,"phone_public"?: string | null,"status"?: Database["public"]['Enums']["provider_status"],"status_changed_at"?: string | null,"status_note"?: string | null,"status_seen_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: string | null,"city"?: string | null,"created_at"?: string,"description"?: string | null,"display_name"?: string,"id"?: string,"phone_public"?: string | null,"status"?: Database["public"]['Enums']["provider_status"],"status_changed_at"?: string | null,"status_note"?: string | null,"status_seen_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "providers_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "field_usage_count":
{ Args: { "p_field_id": string }; Returns: number
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mfa_satisfied":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"search_items":
{ Args: { "p_category"?: string,"p_filters"?: Json,"p_limit"?: number,"p_max_price"?: number,"p_min_price"?: number,"p_offset"?: number,"p_query"?: string,"p_sort"?: string }; Returns: {
              "attributes": NonNullable<Json>,
"category_id": string,
"created_at": string,
"currency": string,
"description": string | null,
"id": string,
"image_path": string | null,
"is_hidden_by_admin": boolean,
"is_published": boolean,
"price": number | null,
"provider_id": string,
"title": string,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "items"
        isOneToOne: false
        isSetofReturn: true
      } },
"validate_item_attributes":
{ Args: { "p_attributes": Json,"p_category_id": string }; Returns: (string)[]
                           }
          }
          Enums: {
            "field_type": "text"|"long_text"|"number"|"integer"|"boolean"|"select"|"multi_select"|"date"|"url","provider_status": "pending"|"approved"|"denied"|"suspended"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "field_type": ["text", "long_text", "number", "integer", "boolean", "select", "multi_select", "date", "url"],"provider_status": ["pending", "approved", "denied", "suspended"]
          }
        }
} as const
