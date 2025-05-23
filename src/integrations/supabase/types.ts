export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_configurations: {
        Row: {
          api_type: Database["public"]["Enums"]["api_config_type_enum"]
          config_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          api_type: Database["public"]["Enums"]["api_config_type_enum"]
          config_data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          api_type?: Database["public"]["Enums"]["api_config_type_enum"]
          config_data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          start_time: string | null
          title: string
          type: Database["public"]["Enums"]["calendar_event_type_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          start_time?: string | null
          title: string
          type: Database["public"]["Enums"]["calendar_event_type_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          start_time?: string | null
          title?: string
          type?: Database["public"]["Enums"]["calendar_event_type_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_stats: {
        Row: {
          created_at: string
          id: string
          scrim_game_id: string
          stat_type: string
          stat_value: Json
          timestamp: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          scrim_game_id: string
          stat_type: string
          stat_value: Json
          timestamp?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          scrim_game_id?: string
          stat_type?: string
          stat_value?: Json
          timestamp?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_stats_scrim_game_id_fkey"
            columns: ["scrim_game_id"]
            isOneToOne: false
            referencedRelation: "scrim_games"
            referencedColumns: ["id"]
          },
        ]
      }
      player_api_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string
          id: string
          linked_profile_id: string | null
          role: string
          summoner_name: string
          team_tag: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_profile_id?: string | null
          role: string
          summoner_name: string
          team_tag?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_profile_id?: string | null
          role?: string
          summoner_name?: string
          team_tag?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_players_linked_profile"
            columns: ["linked_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          ign: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          ign?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          ign?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scrim_games: {
        Row: {
          blue_side_pick: string | null
          created_at: string
          duration: string | null
          game_number: number
          id: string
          notes: string | null
          red_side_pick: string | null
          result: Database["public"]["Enums"]["game_result_enum"]
          scrim_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blue_side_pick?: string | null
          created_at?: string
          duration?: string | null
          game_number: number
          id?: string
          notes?: string | null
          red_side_pick?: string | null
          result?: Database["public"]["Enums"]["game_result_enum"]
          scrim_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blue_side_pick?: string | null
          created_at?: string
          duration?: string | null
          game_number?: number
          id?: string
          notes?: string | null
          red_side_pick?: string | null
          result?: Database["public"]["Enums"]["game_result_enum"]
          scrim_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrim_games_scrim_id_fkey"
            columns: ["scrim_id"]
            isOneToOne: false
            referencedRelation: "scrims"
            referencedColumns: ["id"]
          },
        ]
      }
      scrim_recurrence_rules: {
        Row: {
          created_at: string
          id: string
          notes_template: string | null
          opponent: string
          patch_template: string | null
          rrule_string: string
          series_end_date: string | null
          series_start_date: string
          start_time_template: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes_template?: string | null
          opponent: string
          patch_template?: string | null
          rrule_string: string
          series_end_date?: string | null
          series_start_date: string
          start_time_template?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes_template?: string | null
          opponent?: string
          patch_template?: string | null
          rrule_string?: string
          series_end_date?: string | null
          series_start_date?: string
          start_time_template?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scrims: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          opponent: string
          overall_result: string | null
          patch: string | null
          recurrence_rule_id: string | null
          scrim_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["scrim_status_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          opponent: string
          overall_result?: string | null
          patch?: string | null
          recurrence_rule_id?: string | null
          scrim_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["scrim_status_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          opponent?: string
          overall_result?: string | null
          patch?: string | null
          recurrence_rule_id?: string | null
          scrim_date?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["scrim_status_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrims_recurrence_rule_id_fkey"
            columns: ["recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "scrim_recurrence_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      api_config_type_enum: "RIOT" | "GRID"
      app_role: "admin" | "coach" | "player"
      calendar_event_type_enum: "official" | "meeting" | "theory" | "other"
      game_result_enum: "Win" | "Loss" | "Draw" | "N/A"
      scrim_status_enum: "Scheduled" | "Completed" | "Cancelled" | "In Progress"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      api_config_type_enum: ["RIOT", "GRID"],
      app_role: ["admin", "coach", "player"],
      calendar_event_type_enum: ["official", "meeting", "theory", "other"],
      game_result_enum: ["Win", "Loss", "Draw", "N/A"],
      scrim_status_enum: ["Scheduled", "Completed", "Cancelled", "In Progress"],
    },
  },
} as const
