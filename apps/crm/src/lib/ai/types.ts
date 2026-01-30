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
  constraints: { gdpr_relevant: boolean; budget_sensitivity: string; plan: string };
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
