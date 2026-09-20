import type { InfographicDocument } from './infographics';

export type InfographicAudience = 'Software engineers' | 'Data engineers' | 'AI engineers' | 'Project managers' | 'Management';

export type InfographicTemplate = {
  id: string;
  name: string;
  audience: InfographicAudience;
  purpose: string;
  type: string;
  source: string;
};

function template(id: string, name: string, audience: InfographicAudience, purpose: string, document: InfographicDocument): InfographicTemplate {
  return { id, name, audience, purpose, type: document.layout.replace('-', ' '), source: JSON.stringify(document, null, 2) };
}

export const infographicTemplates: InfographicTemplate[] = [
  template('software-platform-stack', 'Software platform stack', 'Software engineers', 'Explain the responsibilities and technologies across an application platform.', {
    type: 'infographic', layout: 'layered-stack', title: 'Software Platform Stack', subtitle: 'Responsibilities and tools by layer', palette: 'sage',
    columns: { left: 'Engineering need', right: 'Typical choices' },
    sections: [
      { name: 'Experience', left: ['Web UI', 'Mobile', 'Accessibility'], right: ['React', 'React Native', 'Design system'] },
      { name: 'Application', left: ['Business rules', 'Workflows', 'Validation'], right: ['Node.js', 'Java', 'Go'] },
      { name: 'Integration', left: ['APIs', 'Events', 'Contracts'], right: ['REST', 'GraphQL', 'Kafka'] },
      { name: 'Data', left: ['Transactions', 'Caching', 'Search'], right: ['PostgreSQL', 'Redis', 'OpenSearch'] },
      { name: 'Platform', left: ['Runtime', 'Scaling', 'Delivery'], right: ['Containers', 'Kubernetes', 'CI/CD'] },
      { name: 'Reliability', left: ['Telemetry', 'Resilience', 'Security'], right: ['OpenTelemetry', 'SLOs', 'Policy as code'] },
    ],
  }),
  template('software-delivery-roadmap', 'Engineering delivery roadmap', 'Software engineers', 'Communicate how a product moves from discovery to dependable operation.', {
    type: 'infographic', layout: 'roadmap', title: 'Engineering Delivery Roadmap', subtitle: 'From problem framing to reliable operation', palette: 'ocean',
    sections: [
      { name: 'Discover', description: 'User problem • constraints • measurable outcome' },
      { name: 'Design', description: 'Architecture • interfaces • threat model' },
      { name: 'Build', description: 'Small increments • reviews • automated tests' },
      { name: 'Release', description: 'Progressive delivery • rollback • validation' },
      { name: 'Operate', description: 'SLOs • observability • learning loop' },
    ],
  }),
  template('cloud-security-landscape', 'Cloud security landscape', 'Software engineers', 'Map defense-in-depth controls from governance and identity through detection and recovery.', {
    type: 'infographic', layout: 'layered-stack', title: 'Cloud Security: Code to Recovery', subtitle: 'Control objectives first — products can change', palette: 'slate',
    columns: { left: 'Security objective', right: 'Practice or tool category' },
    sections: [
      { name: 'Govern', left: ['Risk ownership', 'Policy', 'Assurance'], right: ['Control framework', 'Evidence', 'Risk register'] },
      { name: 'Identity', left: ['Strong identity', 'Least privilege', 'Workload trust'], right: ['SSO and MFA', 'IAM', 'Short-lived identity'] },
      { name: 'Data', left: ['Classify', 'Encrypt', 'Limit exposure'], right: ['KMS', 'Secrets manager', 'DLP'] },
      { name: 'Application and API', left: ['Secure design', 'Abuse resistance', 'Authorization'], right: ['Threat modeling', 'API gateway', 'WAF'] },
      { name: 'Software supply chain', left: ['Trusted source', 'Verified build', 'Safe dependency'], right: ['SAST and SCA', 'SBOM', 'Artifact signing'] },
      { name: 'Workload', left: ['Harden runtime', 'Isolate', 'Patch'], right: ['CSPM and CNAPP', 'Runtime policy', 'Vulnerability scan'] },
      { name: 'Network', left: ['Segment', 'Inspect', 'Control egress'], right: ['Zero trust', 'Firewall', 'Service mesh'] },
      { name: 'Detect', left: ['Centralize signals', 'Find threats', 'Prioritize'], right: ['Cloud logs', 'SIEM', 'Threat detection'] },
      { name: 'Respond and recover', left: ['Contain', 'Restore', 'Learn'], right: ['SOAR', 'Runbooks', 'Backup validation'] },
    ],
  }),
  template('full-stack-sre-toolchain', 'Full-stack SRE toolchain', 'Software engineers', 'Follow reliability signals and controls from the user experience down to infrastructure.', {
    type: 'infographic', layout: 'layered-stack', title: 'Full-Stack SRE: Click to Recovery', subtitle: 'Own the user journey, not just the infrastructure', palette: 'sunset',
    columns: { left: 'Reliability responsibility', right: 'Practice or tool category' },
    sections: [
      { name: 'User experience', left: ['Availability', 'Latency', 'Correctness'], right: ['RUM', 'Synthetic checks', 'Journey tests'] },
      { name: 'SLO and error budget', left: ['Define good', 'Measure risk', 'Balance change'], right: ['SLIs', 'SLOs', 'Error budgets'] },
      { name: 'Application', left: ['Instrument', 'Degrade safely', 'Protect dependencies'], right: ['OpenTelemetry', 'Feature flags', 'Circuit breakers'] },
      { name: 'Telemetry', left: ['Correlate', 'Query', 'Retain'], right: ['Metrics', 'Logs', 'Distributed traces'] },
      { name: 'Detection', left: ['Alert on impact', 'Reduce noise', 'Route ownership'], right: ['Burn-rate alerts', 'On-call', 'Service catalog'] },
      { name: 'Delivery', left: ['Ship safely', 'Verify', 'Reverse'], right: ['CI/CD', 'Canary release', 'Rollback'] },
      { name: 'Platform', left: ['Schedule', 'Scale', 'Standardize'], right: ['Containers', 'Kubernetes', 'Infrastructure as code'] },
      { name: 'Resilience', left: ['Test failure', 'Recover data', 'Manage capacity'], right: ['Chaos tests', 'Backups', 'Load tests'] },
      { name: 'Incident learning', left: ['Coordinate', 'Restore', 'Improve'], right: ['Incident command', 'Runbooks', 'Blameless review'] },
    ],
  }),
  template('data-platform-stack', 'Modern data platform', 'Data engineers', 'Map ingestion, storage, transformation, serving, and governance.', {
    type: 'infographic', layout: 'layered-stack', title: 'Modern Data Platform', subtitle: 'Capabilities from sources to decisions', palette: 'ocean',
    columns: { left: 'Capability', right: 'Example technologies' },
    sections: [
      { name: 'Consumption', left: ['BI', 'Analytics', 'Data products'], right: ['Power BI', 'Tableau', 'APIs'] },
      { name: 'Semantic layer', left: ['Metrics', 'Models', 'Catalog'], right: ['dbt', 'Cube', 'DataHub'] },
      { name: 'Processing', left: ['Transform', 'Streaming', 'Quality'], right: ['Spark', 'Flink', 'Great Expectations'] },
      { name: 'Storage', left: ['Warehouse', 'Lakehouse', 'Operational'], right: ['Snowflake', 'Delta Lake', 'PostgreSQL'] },
      { name: 'Ingestion', left: ['Batch', 'CDC', 'Events'], right: ['Airbyte', 'Debezium', 'Kafka'] },
      { name: 'Governance', left: ['Lineage', 'Privacy', 'Access'], right: ['OpenLineage', 'Policies', 'Audit logs'] },
    ],
  }),
  template('modern-data-ai-ecosystem', 'Modern data and AI ecosystem', 'Data engineers', 'Connect raw sources to governed data, retrieval, models, evaluation, and user-facing AI products.', {
    type: 'infographic', layout: 'layered-stack', title: 'From Raw Data to AI Product', subtitle: 'A capability-first map for modern data and AI teams', palette: 'ocean',
    columns: { left: 'What the layer must do', right: 'Representative choices' },
    sections: [
      { name: 'Experience', left: ['AI apps', 'Analytics', 'APIs'], right: ['Web UI', 'Data apps', 'BI tools'] },
      { name: 'Decision products', left: ['Assist', 'Predict', 'Explain'], right: ['Copilots', 'Model endpoints', 'Semantic metrics'] },
      { name: 'Models and inference', left: ['Select model', 'Route', 'Serve'], right: ['Hosted models', 'Open models', 'Small models'] },
      { name: 'Orchestration', left: ['Coordinate steps', 'Manage state', 'Call tools'], right: ['DAG engine', 'Agent runtime', 'MCP'] },
      { name: 'Retrieval and context', left: ['Embed', 'Search', 'Rerank'], right: ['Vector index', 'Hybrid search', 'Knowledge graph'] },
      { name: 'Evaluation', left: ['Test quality', 'Trace', 'Watch drift'], right: ['Eval harness', 'OpenTelemetry', 'Model monitor'] },
      { name: 'Transform and semantics', left: ['Clean', 'Test', 'Define meaning'], right: ['dbt', 'Spark', 'Semantic layer'] },
      { name: 'Storage and indexes', left: ['Persist', 'Version', 'Retrieve'], right: ['Lakehouse', 'Warehouse', 'Vector database'] },
      { name: 'Ingestion and streams', left: ['Batch', 'Capture changes', 'Stream'], right: ['Connectors', 'CDC', 'Kafka'] },
      { name: 'Governance and platform', left: ['Own', 'Secure', 'Reproduce'], right: ['Catalog', 'Policy', 'CI/CD'] },
    ],
  }),
  template('data-quality-pyramid', 'Data quality pyramid', 'Data engineers', 'Show the foundations required before advanced analytics can be trusted.', {
    type: 'infographic', layout: 'pyramid', title: 'Data Quality Pyramid', subtitle: 'Trust is built from the bottom up', palette: 'slate',
    sections: [
      { name: 'Decision confidence', description: 'Trusted metrics and responsible use' },
      { name: 'Semantic consistency', description: 'Shared definitions • governed dimensions' },
      { name: 'Validity', description: 'Business rules • acceptable ranges • freshness' },
      { name: 'Integrity', description: 'Keys • relationships • deduplication' },
      { name: 'Observability', description: 'Ownership • lineage • incidents • recovery' },
    ],
  }),
  template('ai-agent-stack', 'AI agent stack', 'AI engineers', 'Explain the capabilities and implementation choices in an agentic system.', {
    type: 'infographic', layout: 'layered-stack', title: 'The AI Agent Stack', subtitle: 'Capabilities and implementation choices by layer', palette: 'sage',
    columns: { left: 'Need this', right: 'Use this' },
    sections: [
      { name: 'Interface', left: ['Chat', 'Dashboards', 'Copilots'], right: ['Web app', 'SDK', 'Messaging'] },
      { name: 'Orchestration', left: ['Planning', 'Workflows', 'Coordination'], right: ['State graph', 'Task queue', 'Agent runtime'] },
      { name: 'Models', left: ['Reasoning', 'Generation', 'Classification'], right: ['Hosted LLM', 'Small model', 'Rules'] },
      { name: 'Memory', left: ['User context', 'Task state', 'History'], right: ['SQL', 'Cache', 'Event log'] },
      { name: 'Knowledge', left: ['Grounding', 'Retrieval', 'Citations'], right: ['Search', 'Vector index', 'Knowledge graph'] },
      { name: 'Tools', left: ['APIs', 'Applications', 'Actions'], right: ['MCP', 'Functions', 'Workflows'] },
      { name: 'Guardrails', left: ['Identity', 'Permissions', 'Safety'], right: ['OAuth', 'Policy engine', 'Approval gates'] },
      { name: 'Evaluation', left: ['Tracing', 'Quality', 'Cost'], right: ['Evals', 'Telemetry', 'Budgets'] },
      { name: 'Runtime', left: ['Hosting', 'Scaling', 'Delivery'], right: ['Containers', 'Workers', 'Serverless'] },
    ],
  }),
  template('ai-system-readiness', 'AI system readiness', 'AI engineers', 'Compare a prototype with the controls required for production.', {
    type: 'infographic', layout: 'comparison', title: 'AI Prototype vs Production', subtitle: 'What changes before real users depend on it', palette: 'sunset',
    columns: { left: 'Prototype', right: 'Production-ready' },
    sections: [
      { name: 'Purpose', left: ['Broad demo prompt'], right: ['Bounded task', 'Success criteria'] },
      { name: 'Data', left: ['Convenient examples'], right: ['Approved sources', 'Privacy controls'] },
      { name: 'Actions', left: ['Direct tool calls'], right: ['Least privilege', 'Approval boundaries'] },
      { name: 'Quality', left: ['Looks reasonable'], right: ['Evaluations', 'Known failure modes'] },
      { name: 'Operations', left: ['Manual inspection'], right: ['Tracing', 'Budgets', 'Incident response'] },
    ],
  }),
  template('ai-foundations-map', 'AI algorithms and data structures', 'AI engineers', 'Connect foundational computer-science structures and algorithms to their uses in AI systems.', {
    type: 'infographic', layout: 'comparison', title: 'AI Foundations Map', subtitle: 'How classical algorithms and data structures reappear in modern AI', palette: 'ocean',
    columns: { left: 'Classical foundation', right: 'AI and ML connection' },
    sections: [
      { name: 'Vectors and matrices', left: ['Arrays', 'Linear algebra', 'Matrix operations'], right: ['Tensors', 'Embeddings', 'Attention projections'] },
      { name: 'Graphs', left: ['Nodes and edges', 'Adjacency lists', 'Graph traversal'], right: ['Knowledge graphs', 'Computation graphs', 'Agent state graphs'] },
      { name: 'Trees', left: ['Binary trees', 'Search trees', 'Decision trees'], right: ['Random forests', 'MCTS planning', 'Hierarchical clustering'] },
      { name: 'Hashing', left: ['Hash maps', 'Sets', 'Memoization'], right: ['Vocabulary lookup', 'Feature stores', 'Inference caches'] },
      { name: 'Tries', left: ['Prefix trees', 'String lookup', 'Autocomplete'], right: ['Token prefixes', 'Constrained decoding', 'Lexical retrieval'] },
      { name: 'Priority structures', left: ['Queues', 'Heaps', 'Ring buffers'], right: ['Beam search', 'Best-first planning', 'Replay buffers'] },
      { name: 'Graph search', left: ['BFS and DFS', 'Dijkstra', 'A-star'], right: ['State-space planning', 'Path finding', 'Tool-chain exploration'] },
      { name: 'Dynamic programming', left: ['Memoization', 'Tabulation', 'Optimal substructure'], right: ['Viterbi decoding', 'Sequence alignment', 'Value iteration'] },
      { name: 'Nearest neighbors', left: ['Distance metrics', 'K-d trees', 'Locality hashing'], right: ['Vector retrieval', 'ANN indexes', 'Similarity search'] },
      { name: 'Probabilistic models', left: ['Bayes rule', 'Markov chains', 'Sampling'], right: ['Naive Bayes', 'Hidden Markov models', 'Decision processes'] },
      { name: 'Optimization', left: ['Calculus', 'Gradient methods', 'Numerical optimization'], right: ['Backpropagation', 'Model training', 'Parameter tuning'] },
    ],
  }),
  template('project-lifecycle', 'Project lifecycle', 'Project managers', 'Present project phases, deliverables, and governance checkpoints.', {
    type: 'infographic', layout: 'roadmap', title: 'Project Delivery Lifecycle', subtitle: 'Decisions and evidence at every phase', palette: 'sunset',
    sections: [
      { name: 'Initiate', left: ['Problem statement', 'Sponsor'], right: ['Charter', 'Outcome metric'] },
      { name: 'Plan', left: ['Scope', 'Dependencies'], right: ['Roadmap', 'Risk register'] },
      { name: 'Execute', left: ['Delivery', 'Communication'], right: ['Increment', 'Status evidence'] },
      { name: 'Validate', left: ['Acceptance', 'Readiness'], right: ['Sign-off', 'Launch decision'] },
      { name: 'Close and learn', left: ['Handover', 'Benefits'], right: ['Retrospective', 'Follow-up'] },
    ],
  }),
  template('project-tradeoffs', 'Project trade-off canvas', 'Project managers', 'Compare choices across value, effort, risk, and timing.', {
    type: 'infographic', layout: 'comparison', title: 'Project Trade-off Canvas', subtitle: 'Make the decision and its consequences visible', palette: 'slate',
    columns: { left: 'Option A', right: 'Option B' },
    sections: [
      { name: 'Outcome', left: ['Expected value'], right: ['Expected value'] },
      { name: 'Delivery', left: ['Time', 'People'], right: ['Time', 'People'] },
      { name: 'Risk', left: ['Key uncertainty'], right: ['Key uncertainty'] },
      { name: 'Reversibility', left: ['Cost to change'], right: ['Cost to change'] },
      { name: 'Recommendation', left: ['Why choose A'], right: ['Why choose B'] },
    ],
  }),
  template('operating-model', 'Management operating model', 'Management', 'Connect strategy, execution, measurement, and organizational learning.', {
    type: 'infographic', layout: 'layered-stack', title: 'Management Operating Model', subtitle: 'How intent becomes measurable execution', palette: 'slate',
    columns: { left: 'Management question', right: 'Operating mechanism' },
    sections: [
      { name: 'Purpose', left: ['Why now?', 'For whom?', 'What value?'], right: ['Mission', 'Customer promise', 'Principles'] },
      { name: 'Strategy', left: ['Where to play?', 'How to win?'], right: ['Choices', 'Portfolio', 'Guardrails'] },
      { name: 'Execution', left: ['Who owns it?', 'What comes next?'], right: ['Teams', 'Priorities', 'Cadence'] },
      { name: 'Measurement', left: ['Is it working?', 'At what cost?'], right: ['Outcomes', 'Leading signals', 'Reviews'] },
      { name: 'Learning', left: ['What changed?', 'What stops?'], right: ['Feedback', 'Retrospectives', 'Adaptation'] },
    ],
  }),
  template('delegation-pyramid', 'Delegation boundaries', 'Management', 'Show how authority increases only as evidence and controls improve.', {
    type: 'infographic', layout: 'pyramid', title: 'Delegation Boundaries', subtitle: 'Delegate authority in proportion to verified control', palette: 'sunset',
    sections: [
      { name: 'Autonomous execution', description: 'Bounded authority • continuous monitoring • immediate stop' },
      { name: 'Act with approval', description: 'Human confirms material or irreversible actions' },
      { name: 'Recommend', description: 'System proposes options with evidence and uncertainty' },
      { name: 'Observe', description: 'Read-only access • logs • no operational authority' },
    ],
  }),
  template('engineering-career-map', 'Engineering career map', 'Management', 'Connect durable foundations, specialist paths, and senior leadership expectations.', {
    type: 'infographic', layout: 'layered-stack', title: 'Choose Your Stack Career Path', subtitle: 'Build the foundation, prove a specialty, then connect systems', palette: 'sage',
    columns: { left: 'Evidence to build', right: 'Roles this supports' },
    sections: [
      { name: 'Lead outcomes', left: ['Strategy', 'Talent', 'Business impact'], right: ['Engineering manager', 'Director', 'Technology leader'] },
      { name: 'Connect systems', left: ['Architecture', 'Trade-offs', 'Influence'], right: ['Staff engineer', 'Principal engineer', 'Architect'] },
      { name: 'Site reliability', left: ['SLO ownership', 'Automation', 'Incident leadership'], right: ['SRE', 'Platform engineer', 'Production engineer'] },
      { name: 'Cloud security', left: ['Threat model', 'Identity', 'Control evidence'], right: ['Cloud security engineer', 'DevSecOps', 'Security architect'] },
      { name: 'AI engineering', left: ['Model integration', 'Evaluation', 'Safe automation'], right: ['AI engineer', 'ML engineer', 'MLOps engineer'] },
      { name: 'Data engineering', left: ['Pipelines', 'Data quality', 'Governance'], right: ['Data engineer', 'Analytics engineer', 'Data platform engineer'] },
      { name: 'Software engineering', left: ['APIs', 'Testing', 'Delivery'], right: ['Frontend engineer', 'Backend engineer', 'Full-stack engineer'] },
      { name: 'Shared foundation', left: ['Programming', 'Linux and networks', 'Git and cloud'], right: ['Projects', 'Internships', 'Entry-level roles'] },
    ],
  }),
];

export const infographicAudiences: Array<'Everyone' | InfographicAudience> = ['Everyone', 'Software engineers', 'Data engineers', 'AI engineers', 'Project managers', 'Management'];
