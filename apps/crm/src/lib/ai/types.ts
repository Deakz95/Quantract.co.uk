export interface CrmInputJson {
  user: { role: string; experience_level: string };
  company: { industry: string; size: string; sales_cycle: string; primary_goal: string };
  current_setup: {
    modules_enabled: string[];
    pipeline_stages: string[];
    deal_stages: string[];
    integrations: string[];
    custom_fields_count: number;
    automations_count: number;
  };
  signals_from_site: {
    pages_visited: string[];
    recent_actions: string[];
    pain_points_stated: string[];
    usage_metrics: Record<string, number>;
  };
  financials: {
    monthly_overhead_pounds: number;
    avg_margin_percent: number;
    break_even_revenue_pounds: number;
    earned_this_month_pounds: number;
    break_even_progress_percent: number;
    days_left_in_month: number;
    configured: boolean;
  };
  constraints: { gdpr_relevant: boolean; budget_sensitivity: string; plan: string };
  available_features: {
    automations: boolean;
    custom_fields: boolean;
    engineer_portal: boolean;
    email_templates: boolean;
    reports: boolean;
    integrations: boolean;
    client_portal: boolean;
    client_portal_messaging: boolean;
    payments_terms: boolean;
  };
}

export interface CrmRecommendations {
  summary: string;
  top_recommendations: Array<{
    title: string;
    why_it_matters: string;
    steps_in_app: string[];
    expected_impact: string;
    effort: string;
  }>;
  quick_wins: string[];
  risks_or_gaps: string[];
  questions: string[];
}
