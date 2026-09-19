// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Client-Side Semantic Concept Matcher & Taxonomy Graph (160+ Domains)
// Computes multi-directional technical skill equivalence, synonym normalization,
// and conceptual match scoring without requiring external cloud LLM APIs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Bidirectional Technical & Industry Concept Taxonomy Graph
 * Maps 160+ core competencies, tools, frameworks, and architectural domains
 * to their conceptual equivalents, parent systems, and child technologies.
 */
export const CONCEPT_TAXONOMY_GRAPH = {
  // ── 1. Frontend & Client Engineering ──
  'react': ['react.js', 'reactjs', 'frontend', 'react hooks', 'redux', 'next.js', 'virtual dom', 'ui components', 'single page application', 'spa', 'jsx', 'tsx'],
  'typescript': ['ts', 'static typing', 'type safety', 'javascript', 'frontend architecture', 'interfaces', 'generics', 'ts/js'],
  'javascript': ['js', 'es6', 'es6+', 'ecmascript', 'vanilla js', 'modern javascript', 'web development', 'frontend development'],
  'next.js': ['nextjs', 'react', 'react.js', 'server side rendering', 'ssr', 'static site generation', 'ssg', 'react framework', 'full stack', 'app router'],
  'vue': ['vue.js', 'vuejs', 'vuex', 'pinia', 'nuxt', 'nuxt.js', 'vue 3', 'frontend framework'],
  'angular': ['angular.js', 'angularjs', 'angular 2+', 'ngrx', 'rxjs', 'frontend framework', 'typescript framework'],
  'svelte': ['sveltekit', 'svelte.js', 'reactive framework', 'frontend compiler'],
  'html5': ['html', 'semantic html', 'web markup', 'dom', 'web components', 'canvas api'],
  'css3': ['css', 'cascading style sheets', 'responsive design', 'flexbox', 'css grid', 'animations'],
  'tailwind css': ['tailwindcss', 'utility-first css', 'css3', 'responsive design', 'css flexbox', 'css grid', 'postcss'],
  'sass': ['scss', 'css preprocessor', 'less', 'stylus', 'modular css'],
  'state management': ['redux', 'zustand', 'mobx', 'recoil', 'jotai', 'context api', 'xstate'],
  'web performance': ['core web vitals', 'lighthouse', 'lazy loading', 'code splitting', 'tree shaking', 'asset optimization', 'tti', 'lcp', 'cls'],
  'web accessibility': ['a11y', 'wcag', 'wcag 2.1', 'aria', 'screen readers', 'inclusive design', 'color contrast'],
  'micro-frontends': ['module federation', 'micro frontends', 'mfe', 'iframe architecture', 'single-spa'],
  'webrtc': ['real-time communication', 'websockets', 'socket.io', 'video streaming', 'peer-to-peer', 'rtc'],

  // ── 2. Backend & Systems Engineering ──
  'node.js': ['nodejs', 'javascript backend', 'express', 'express.js', 'nest.js', 'nestjs', 'fastify', 'server-side javascript', 'async i/o', 'npm'],
  'python': ['python 3', 'django', 'fastapi', 'flask', 'asyncio', 'backend engineering', 'pip', 'poetry'],
  'golang': ['go', 'go language', 'goroutines', 'concurrency', 'systems programming', 'backend engineering', 'gin', 'fiber', 'grpc'],
  'java': ['jvm', 'spring boot', 'spring framework', 'hibernate', 'enterprise java', 'jpa', 'maven', 'gradle', 'object-oriented programming'],
  'c++': ['cpp', 'c/c++', 'systems programming', 'memory management', 'stl', 'concurrency', 'low-latency', 'embedded systems', 'raii'],
  'c#': ['csharp', '.net', '.net core', 'asp.net', 'entity framework', 'microsoft stack', 'linq', 'clr'],
  'rust': ['rustlang', 'cargo', 'memory safety', 'borrow checker', 'systems programming', 'tokio', 'actix', 'concurrency'],
  'ruby on rails': ['rails', 'ruby', 'activerecord', 'mvc', 'backend framework'],
  'php': ['laravel', 'symfony', 'composer', 'php 8', 'backend development', 'lamp stack'],
  'elixir': ['phoenix framework', 'erlang', 'otp', 'beam', 'functional programming', 'fault tolerance'],
  'graphql': ['api design', 'rest api', 'apollo', 'schema design', 'resolvers', 'graphql federation', 'web services'],
  'rest api': ['restful api', 'api design', 'endpoints', 'json', 'openapi', 'swagger', 'http protocols'],
  'grpc': ['protocol buffers', 'protobuf', 'rpc', 'http/2', 'microservices communication', 'inter-service rpc'],
  'microservices': ['distributed systems', 'service oriented architecture', 'soa', 'event driven architecture', 'message queues', 'scalability'],
  'distributed systems': ['consensus algorithms', 'raft', 'cap theorem', 'eventual consistency', 'sharding', 'replication', 'high availability'],
  'event-driven architecture': ['eda', 'event sourcing', 'cqrs', 'pub/sub', 'message brokers', 'async messaging'],
  'kafka': ['apache kafka', 'event streaming', 'kafka streams', 'message broker', 'pub/sub', 'kafka connect'],
  'rabbitmq': ['message queue', 'amqp', 'message broker', 'celery', 'asynchronous tasks'],
  'embedded systems': ['microcontrollers', 'rtos', 'arm cortex', 'firmware', 'c/c++', 'iot', 'i2c', 'spi', 'uart'],
  'linux': ['unix', 'bash', 'shell scripting', 'system administration', 'posix', 'kernel', 'cli', 'systemd'],

  // ── 3. Databases & Storage ──
  'postgresql': ['postgres', 'relational database', 'sql', 'rdbms', 'acid', 'database design', 'query optimization', 'indexing', 'psql', 'pgvector'],
  'mysql': ['mariadb', 'relational database', 'sql', 'rdbms', 'innodb', 'database design', 'database management'],
  'mongodb': ['nosql', 'document database', 'document store', 'bson', 'database design', 'non-relational', 'mongoose'],
  'redis': ['in-memory cache', 'caching', 'key-value store', 'pub/sub', 'session storage', 'redis cluster', 'memcached'],
  'elasticsearch': ['elastic stack', 'elk', 'opensearch', 'full-text search', 'lucene', 'indexing', 'logstash', 'kibana'],
  'dynamodb': ['amazon dynamodb', 'nosql', 'key-value store', 'single table design', 'aws database'],
  'cassandra': ['apache cassandra', 'wide-column store', 'scylla', 'distributed database', 'high throughput'],
  'database design': ['schema design', 'data modeling', 'normalization', 'erd', 'foreign keys', 'indexes', 'query optimization'],
  'snowflake': ['cloud data warehouse', 'data warehousing', 'data lakehouse', 'data analytics', 'sql analytics'],
  'bigquery': ['google bigquery', 'data warehouse', 'serverless sql', 'data analytics', 'gcp analytics'],
  'supabase': ['baas', 'postgres backend', 'firebase alternative', 'row level security', 'rls', 'edge functions'],
  'vector database': ['pinecone', 'weaviate', 'qdrant', 'chromadb', 'milvus', 'vector embeddings', 'semantic search', 'similarity search'],

  // ── 4. Cloud & DevOps / SRE ──
  'kubernetes': ['k8s', 'container orchestration', 'helm', 'docker', 'containers', 'cloud native', 'eks', 'gke', 'aks', 'service mesh', 'ingress'],
  'docker': ['containerization', 'containers', 'kubernetes', 'k8s', 'container orchestration', 'docker compose', 'dockerfile', 'oci', 'container runtime', 'podman'],
  'aws': ['amazon web services', 'cloud architecture', 'ec2', 's3', 'lambda', 'serverless', 'iam', 'cloudformation', 'vpc', 'ecs', 'fargate'],
  'gcp': ['google cloud', 'google cloud platform', 'cloud run', 'gke', 'cloud storage', 'pub/sub', 'cloud functions', 'cloud build'],
  'azure': ['microsoft azure', 'azure devops', 'aks', 'blob storage', 'cosmos db', 'azure functions', 'arm templates', 'entra id'],
  'terraform': ['iac', 'infrastructure as code', 'terragrunt', 'hcl', 'cloudformation', 'pulumi', 'ansible'],
  'ansible': ['configuration management', 'playbooks', 'automation', 'chef', 'puppet'],
  'ci/cd': ['continuous integration', 'continuous deployment', 'github actions', 'gitlab ci', 'jenkins', 'argo cd', 'circleci', 'pipelines', 'deployment automation'],
  'github actions': ['gh actions', 'workflow automation', 'ci/cd pipelines', 'github workflows'],
  'prometheus': ['metrics collection', 'grafana', 'alertmanager', 'monitoring', 'time series database', 'promql'],
  'grafana': ['dashboards', 'data visualization', 'metrics monitoring', 'observability', 'telemetry'],
  'datadog': ['apm', 'application performance monitoring', 'cloud monitoring', 'log management', 'distributed tracing'],
  'serverless': ['aws lambda', 'cloud functions', 'faas', 'serverless framework', 'event-driven architecture'],
  'service mesh': ['istio', 'linkerd', 'envoy', 'traffic management', 'mtls', 'observability proxy'],
  'disaster recovery': ['business continuity', 'backup strategy', 'rpo', 'rto', 'failover', 'multi-region redundancy'],
  'site reliability engineering': ['sre', 'slo', 'sli', 'sla', 'error budgets', 'incident management', 'on-call', 'postmortems', 'observability'],

  // ── 5. Cybersecurity & Compliance ──
  'cybersecurity': ['infosec', 'information security', 'vulnerability assessment', 'threat modeling', 'security posture', 'security architecture'],
  'penetration testing': ['pentesting', 'ethical hacking', 'red teaming', 'vulnerability scanning', 'burp suite', 'metasploit', 'offensive security'],
  'siem': ['soc', 'security operations center', 'splunk', 'microsoft sentinel', 'qradar', 'log analysis', 'threat hunting'],
  'identity & access management': ['iam', 'rbac', 'abac', 'sso', 'saml', 'oauth2', 'oidc', 'active directory', 'okta', 'auth0'],
  'owasp': ['owasp top 10', 'appsec', 'application security', 'sast', 'dast', 'code security audit', 'xss prevention', 'sql injection prevention'],
  'cryptography': ['encryption', 'tls/ssl', 'pki', 'certificates', 'symmetric encryption', 'asymmetric encryption', 'hashing', 'zero knowledge'],
  'incident response': ['incident management', 'threat containment', 'forensics', 'mttd', 'mttr', 'security incident handling'],
  'soc2': ['soc 2 compliance', 'soc 2 type ii', 'compliance audit', 'trust principles', 'security compliance'],
  'iso 27001': ['isms', 'information security management', 'security standard', 'compliance certification'],
  'nist': ['nist framework', 'nist csf', 'nist 800-53', 'cybersecurity framework', 'compliance'],
  'zero trust': ['zero trust architecture', 'zta', 'least privilege', 'micro-segmentation', 'continuous verification'],
  'network security': ['firewalls', 'vpn', 'ids/ips', 'waf', 'ddos protection', 'cloudflare', 'dns security', 'subnets'],

  // ── 6. QA & Automation Engineering ──
  'automated testing': ['qa automation', 'unit testing', 'integration testing', 'e2e testing', 'test automation framework', 'regression testing'],
  'playwright': ['browser automation', 'e2e testing', 'playwright test', 'headless browser', 'cross-browser testing'],
  'cypress': ['e2e testing', 'frontend testing', 'component testing', 'javascript testing'],
  'selenium': ['selenium webdriver', 'browser automation', 'test automation', 'grid', 'webdriver'],
  'api testing': ['postman', 'rest assured', 'supertest', 'pact', 'contract testing', 'api automation'],
  'load testing': ['performance testing', 'k6', 'jmeter', 'locust', 'stress testing', 'concurrency testing'],
  'test driven development': ['tdd', 'bdd', 'behavior driven development', 'cucumber', 'specifications', 'unit tests first'],
  'jest': ['vitest', 'javascript testing', 'mocking', 'snapshot testing', 'code coverage'],
  'mobile testing': ['appium', 'espresso', 'xcuitest', 'mobile qa', 'device farm testing'],
  'quality engineering': ['sdet', 'software development engineer in test', 'qa strategy', 'defect tracking', 'test plans', 'quality metrics'],

  // ── 7. Data Science, AI/ML & MLOps ──
  'machine learning': ['ml', 'scikit-learn', 'supervised learning', 'unsupervised learning', 'classification', 'regression', 'clustering', 'random forest', 'xgboost'],
  'deep learning': ['neural networks', 'cnn', 'rnn', 'lstm', 'transformers', 'backpropagation', 'gradient descent'],
  'pytorch': ['torch', 'deep learning framework', 'tensor computation', 'model training', 'hugging face', 'gpu acceleration'],
  'tensorflow': ['keras', 'deep learning', 'tensorboard', 'tflite', 'model training', 'tf.keras'],
  'natural language processing': ['nlp', 'text mining', 'tokenization', 'named entity recognition', 'ner', 'sentiment analysis', 'topic modeling', 'word2vec'],
  'large language models': ['llm', 'generative ai', 'genai', 'gpt', 'prompt engineering', 'langchain', 'llamaindex', 'rag', 'fine-tuning', 'rlhf'],
  'computer vision': ['cv', 'opencv', 'image processing', 'object detection', 'yolo', 'image segmentation', 'facial recognition'],
  'data science': ['predictive analytics', 'statistical modeling', 'data mining', 'hypothesis testing', 'pandas', 'numpy', 'scipy'],
  'data engineering': ['etl', 'elt', 'data pipelines', 'data lake', 'data warehouse', 'batch processing', 'stream processing'],
  'apache spark': ['pyspark', 'spark sql', 'distributed data processing', 'spark streaming', 'databricks', 'hadoop'],
  'mlops': ['machine learning operations', 'model deployment', 'mlflow', 'kubeflow', 'model monitoring', 'feature store', 'model registry', 'dvc'],
  'sql': ['structured query language', 'data analysis', 'complex queries', 'window functions', 'joins', 'aggregations', 'stored procedures'],
  'data visualization': ['tableau', 'power bi', 'powerbi', 'looker', 'd3.js', 'matplotlib', 'seaborn', 'dashboards'],
  'apache airflow': ['airflow', 'workflow orchestration', 'dag', 'data scheduling', 'prefect', 'dagster'],
  'statistics': ['statistical analysis', 'a/b testing', 'experimentation', 'bayesian analysis', 'confidence intervals', 'p-value', 'regression analysis'],

  // ── 8. Product & Design ──
  'product management': ['product strategy', 'product lifecycle', 'roadmapping', 'prd authoring', 'feature prioritization', 'kpis', 'okrs'],
  'product strategy': ['go to market', 'gtm', 'product discovery', 'market fit', 'competitive analysis', 'value proposition'],
  'ui/ux design': ['ux design', 'ui design', 'user experience', 'user interface', 'interaction design', 'visual design', 'usability'],
  'figma': ['figjam', 'sketch', 'adobe xd', 'wireframing', 'prototyping', 'components', 'auto-layout', 'design handoff'],
  'design systems': ['component library', 'design tokens', 'atomic design', 'storybook', 'ui kit', 'pattern library'],
  'user research': ['usability testing', 'user interviews', 'user personas', 'journey mapping', 'heuristic evaluation', 'card sorting'],
  'prototyping': ['interactive prototypes', 'wireframes', 'mockups', 'high fidelity prototypes', 'framer', 'invision'],
  'agile': ['scrum', 'kanban', 'sprint planning', 'scrum master', 'backlog grooming', 'retrospectives', 'jira', 'confluence'],
  'conversion rate optimization': ['cro', 'funnel optimization', 'a/b testing', 'landing page optimization', 'user drop-off analysis'],
  'information architecture': ['ia', 'site mapping', 'content hierarchy', 'navigation taxonomy', 'user flow'],

  // ── 9. Mobile Engineering ──
  'react native': ['react-native', 'expo', 'mobile app development', 'cross platform mobile', 'mobile javascript'],
  'flutter': ['dart', 'cross platform mobile', 'flutter widgets', 'mobile app development'],
  'ios development': ['swift', 'swiftui', 'objective-c', 'xcode', 'cocoapods', 'app store submission', 'core data', 'ios sdk'],
  'android development': ['kotlin', 'jetpack compose', 'android studio', 'gradle', 'android sdk', 'material design', 'google play console'],
  'mobile architecture': ['mvvm', 'mvi', 'clean architecture mobile', 'offline-first', 'push notifications', 'deep linking'],
  'cross-platform mobile': ['hybrid mobile', 'capacitor', 'ionic', 'cordova', 'multiplatform'],

  // ── 10. Sales & Business Development ──
  'enterprise sales': ['b2b sales', 'enterprise b2b', 'solution selling', 'meddpicc', 'challenger sale', 'strategic accounts', 'complex sales'],
  'salesforce': ['sfdc', 'salesforce crm', 'sales cloud', 'crm administration', 'pipeline management', 'hubspot crm'],
  'account management': ['key accounts', 'client retention', 'upselling', 'cross-selling', 'client relationship management'],
  'sales prospecting': ['outbound sales', 'lead generation', 'cold outreach', 'sales cadence', 'outreach.io', 'salesloft', 'apollo.io'],
  'sales methodology': ['meddic', 'spin selling', 'sandler', 'solution selling', 'value selling'],
  'sales forecasting': ['pipeline forecasting', 'quota attainment', 'revenue operations', 'revops', 'deal velocity', 'win rate'],
  'contract negotiation': ['closing deals', 'procurement negotiations', 'deal structuring', 'msa', 'sow', 'pricing negotiations'],
  'customer success': ['csm', 'client success', 'nrr', 'net revenue retention', 'churn reduction', 'onboarding', 'gainsight', 'qbr'],

  // ── 11. Marketing & Growth ──
  'growth marketing': ['demand generation', 'performance marketing', 'user acquisition', 'growth hacking', 'funnel marketing'],
  'search engine optimization': ['seo', 'technical seo', 'on-page seo', 'backlinks', 'keyword research', 'ahrefs', 'semrush', 'google search console'],
  'paid acquisition': ['ppc', 'google ads', 'meta ads', 'linkedin ads', 'facebook ads', 'search engine marketing', 'sem', 'cac optimization'],
  'email marketing': ['email automation', 'drip campaigns', 'newsletter', 'hubspot', 'mailchimp', 'klaviyo', 'deliverability'],
  'content marketing': ['content strategy', 'copywriting', 'blogging', 'editorial calendar', 'storytelling', 'thought leadership'],
  'brand strategy': ['brand positioning', 'brand identity', 'messaging framework', 'public relations', 'pr', 'brand awareness'],
  'marketing analytics': ['google analytics 4', 'ga4', 'attribution modeling', 'marketing roi', 'mixpanel', 'amplitude', 'utm tracking'],
  'social media marketing': ['social media strategy', 'community management', 'organic social', 'influencer marketing', 'linkedin content'],

  // ── 12. Finance, Accounting & Legal ──
  'financial modeling': ['dcf', 'discounted cash flow', 'three statement model', 'financial forecasting', 'sensitivity analysis', 'excel modeling', 'lbo'],
  'fp&a': ['financial planning and analysis', 'variance analysis', 'budgeting', 'forecasting', 'capex', 'opex', 'operating budget'],
  'corporate accounting': ['gaap', 'ifrs', 'general ledger', 'month-end close', 'journal entries', 'balance sheet', 'accounts payable', 'accounts receivable'],
  'auditing': ['internal audit', 'external audit', 'financial compliance', 'sox compliance', 'internal controls', 'risk assessment'],
  'erp systems': ['sap', 'oracle netsuite', 'netsuite', 'sap s/4hana', 'workday financial', 'microsoft dynamics'],
  'treasury management': ['cash flow management', 'liquidity management', 'working capital', 'fx hedging', 'bank reconciliations'],
  'mergers & acquisitions': ['m&a', 'due diligence', 'valuation', 'deal execution', 'post-merger integration', 'investment banking'],
  'corporate tax': ['tax compliance', 'tax provision', 'transfer pricing', 'corporate returns', 'tax strategy'],
  'corporate law': ['contract lifecycle management', 'clm', 'legal compliance', 'regulatory compliance', 'intellectual property', 'ip protection'],
  'privacy & gdpr': ['gdpr', 'ccpa', 'data privacy', 'data protection officer', 'privacy compliance', 'privacy by design'],

  // ── 13. Human Resources & Talent ──
  'talent acquisition': ['recruiting', 'technical recruiting', 'sourcing', 'candidate screening', 'ats management', 'greenhouse', 'lever', 'headhunting'],
  'hr business partnering': ['hrbp', 'strategic hr', 'people operations', 'employee engagement', 'organizational design', 'succession planning'],
  'hris': ['workday', 'bamboohr', 'adp', 'gusto', 'rippling', 'people analytics', 'hr systems'],
  'performance management': ['okrs', 'performance reviews', '360 feedback', 'employee development', 'competency frameworks', 'career ladders'],
  'compensation & benefits': ['total rewards', 'equity compensation', 'salary benchmarking', 'benefits administration', 'compensation planning'],
  'employee relations': ['conflict resolution', 'investigations', 'workplace culture', 'employee retention', 'labor relations'],
  'diversity, equity & inclusion': ['dei', 'de&i', 'inclusive hiring', 'employee resource groups', 'erg', 'workplace diversity'],
  'labor law & compliance': ['employment law', 'eeoc', 'flsa', 'osha', 'fmla', 'hr compliance', 'workplace policies'],

  // ── 14. Operations, Supply Chain, Healthcare & Education ──
  'supply chain management': ['supply chain', 'demand planning', 'inventory management', 'supply chain optimization', 'vendor management', 'scmv'],
  'procurement': ['strategic sourcing', 'supplier negotiations', 'vendor relations', 'rfp', 'rfi', 'purchase orders', 'spend analysis'],
  'logistics & freight': ['freight forwarding', '3pl', 'transportation management', 'warehouse management', 'wms', 'customs clearance', 'last mile delivery'],
  'operations management': ['business operations', 'bizops', 'process improvement', 'sop authoring', 'operational excellence', 'capacity planning'],
  'lean six sigma': ['six sigma', 'continuous improvement', 'kaizen', '5s', 'dmaic', 'root cause analysis', 'value stream mapping'],
  'healthcare administration': ['ehr', 'emr', 'epic systems', 'cerner', 'hipaa', 'patient care coordination', 'clinical workflows', 'healthcare compliance'],
  'real estate & property': ['property management', 'commercial real estate', 'lease negotiation', 'tenant relations', 'asset management', 'reit', 'facilities management'],
  'education & instructional design': ['curriculum development', 'instructional design', 'lms', 'e-learning', 'canvas lms', 'pedagogy', 'training delivery'],
  'customer service & support': ['helpdesk', 'zendesk', 'freshdesk', 'intercom', 'ticket resolution', 'customer support', 'csat', 'first response time']
};

/**
 * Direct keyword aliases and acronyms used specifically for extraction.
 */
export const CONCEPT_ALIASES = {
  // Frontend
  'react': ['react', 'react.js', 'reactjs'],
  'typescript': ['typescript', 'ts', 'type-script'],
  'javascript': ['javascript', 'js', 'es6', 'es6+', 'ecmascript', 'vanilla js'],
  'next.js': ['next.js', 'nextjs', 'next js', 'next 13', 'next 14', 'next 15'],
  'vue': ['vue', 'vue.js', 'vuejs', 'vue 3', 'vuex', 'pinia', 'nuxt', 'nuxt.js'],
  'angular': ['angular', 'angular.js', 'angularjs', 'angular 2+', 'ngrx', 'rxjs'],
  'svelte': ['svelte', 'sveltekit', 'svelte.js'],
  'html5': ['html5', 'html', 'semantic html'],
  'css3': ['css3', 'css', 'cascading style sheets', 'flexbox', 'css grid'],
  'tailwind css': ['tailwind css', 'tailwindcss', 'tailwind'],
  'sass': ['sass', 'scss', 'css preprocessor'],
  'state management': ['state management', 'redux', 'zustand', 'mobx', 'recoil', 'jotai'],
  'web performance': ['web performance', 'core web vitals', 'lighthouse'],
  'web accessibility': ['web accessibility', 'a11y', 'wcag', 'wcag 2.1'],
  'micro-frontends': ['micro-frontends', 'micro frontends', 'mfe', 'module federation'],
  'webrtc': ['webrtc', 'websockets', 'socket.io'],

  // Backend
  'node.js': ['node.js', 'nodejs', 'express', 'express.js', 'nest.js', 'nestjs', 'fastify'],
  'python': ['python', 'python 3', 'django', 'fastapi', 'flask'],
  'golang': ['golang', 'go language', 'gin', 'fiber'],
  'java': ['java', 'spring boot', 'spring framework', 'hibernate', 'jpa', 'jvm'],
  'c++': ['c++', 'cpp', 'c/c++'],
  'c#': ['c#', 'csharp', '.net', '.net core', 'asp.net', 'entity framework'],
  'rust': ['rust', 'rustlang', 'cargo', 'tokio', 'actix'],
  'ruby on rails': ['ruby on rails', 'rails', 'ruby'],
  'php': ['php', 'laravel', 'symfony'],
  'elixir': ['elixir', 'phoenix framework', 'erlang'],
  'graphql': ['graphql', 'apollo', 'graphql federation'],
  'rest api': ['rest api', 'restful api', 'rest apis', 'rest endpoints', 'restful'],
  'grpc': ['grpc', 'protobuf', 'protocol buffers'],
  'microservices': ['microservices', 'microservice', 'micro-services'],
  'distributed systems': ['distributed systems', 'sharding', 'consensus algorithms', 'raft'],
  'event-driven architecture': ['event-driven architecture', 'event driven architecture', 'event sourcing', 'cqrs'],
  'kafka': ['kafka', 'apache kafka', 'kafka streams'],
  'rabbitmq': ['rabbitmq', 'amqp'],
  'embedded systems': ['embedded systems', 'microcontrollers', 'rtos', 'firmware'],
  'linux': ['linux', 'unix', 'bash', 'shell scripting'],

  // Databases
  'postgresql': ['postgresql', 'postgres', 'psql', 'pgvector'],
  'mysql': ['mysql', 'mariadb'],
  'mongodb': ['mongodb', 'mongo', 'mongoose'],
  'redis': ['redis', 'redis cluster', 'memcached'],
  'elasticsearch': ['elasticsearch', 'elastic stack', 'elk', 'opensearch'],
  'dynamodb': ['dynamodb', 'amazon dynamodb'],
  'cassandra': ['cassandra', 'apache cassandra', 'scylla'],
  'database design': ['database design', 'schema design', 'data modeling', 'database modeling'],
  'snowflake': ['snowflake'],
  'bigquery': ['bigquery', 'google bigquery'],
  'supabase': ['supabase'],
  'vector database': ['vector database', 'vector db', 'pinecone', 'weaviate', 'qdrant', 'chromadb', 'milvus'],

  // Cloud & DevOps
  'kubernetes': ['kubernetes', 'k8s', 'kube', 'kubernetes cluster', 'eks', 'gke', 'aks', 'helm'],
  'docker': ['docker', 'containerization', 'containers', 'docker compose', 'dockerfile', 'podman'],
  'aws': ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'cloudformation', 'ecs', 'fargate'],
  'gcp': ['gcp', 'google cloud', 'google cloud platform', 'cloud run', 'cloud functions'],
  'azure': ['azure', 'microsoft azure', 'azure devops'],
  'terraform': ['terraform', 'terragrunt', 'hcl', 'iac', 'infrastructure as code', 'pulumi'],
  'ansible': ['ansible', 'playbooks'],
  'ci/cd': ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'github actions', 'gitlab ci', 'jenkins', 'argo cd', 'circleci'],
  'github actions': ['github actions', 'gh actions'],
  'prometheus': ['prometheus', 'promql'],
  'grafana': ['grafana'],
  'datadog': ['datadog'],
  'serverless': ['serverless', 'faas'],
  'service mesh': ['service mesh', 'istio', 'linkerd', 'envoy'],
  'disaster recovery': ['disaster recovery', 'failover', 'business continuity'],
  'site reliability engineering': ['site reliability engineering', 'sre', 'slo', 'sli'],

  // Cybersecurity
  'cybersecurity': ['cybersecurity', 'infosec', 'information security'],
  'penetration testing': ['penetration testing', 'pentesting', 'ethical hacking', 'red teaming', 'burp suite', 'metasploit'],
  'siem': ['siem', 'soc', 'splunk', 'microsoft sentinel', 'qradar'],
  'identity & access management': ['identity & access management', 'iam', 'rbac', 'abac', 'sso', 'saml', 'oauth2', 'oidc', 'okta', 'auth0'],
  'owasp': ['owasp', 'owasp top 10', 'appsec', 'sast', 'dast'],
  'cryptography': ['cryptography', 'encryption', 'tls/ssl', 'pki'],
  'incident response': ['incident response', 'threat containment', 'forensics', 'mttd', 'mttr'],
  'soc2': ['soc2', 'soc 2', 'soc 2 compliance', 'soc 2 type ii'],
  'iso 27001': ['iso 27001', 'isms'],
  'nist': ['nist', 'nist framework', 'nist csf', 'nist 800-53'],
  'zero trust': ['zero trust', 'zero trust architecture', 'zta'],
  'network security': ['network security', 'firewalls', 'vpn', 'ids/ips', 'waf', 'ddos protection'],

  // QA
  'automated testing': ['automated testing', 'qa automation', 'test automation', 'regression testing', 'e2e testing'],
  'playwright': ['playwright', 'playwright test'],
  'cypress': ['cypress'],
  'selenium': ['selenium', 'selenium webdriver'],
  'api testing': ['api testing', 'postman', 'rest assured'],
  'load testing': ['load testing', 'performance testing', 'k6', 'jmeter', 'locust'],
  'test driven development': ['test driven development', 'tdd', 'bdd', 'cucumber'],
  'jest': ['jest', 'vitest'],
  'mobile testing': ['mobile testing', 'appium', 'espresso', 'xcuitest', 'mobile qa'],
  'quality engineering': ['quality engineering', 'sdet', 'software development engineer in test'],

  // Data / AI / ML
  'machine learning': ['machine learning', 'ml', 'scikit-learn', 'supervised learning', 'unsupervised learning', 'random forest', 'xgboost'],
  'deep learning': ['deep learning', 'neural networks', 'cnn', 'rnn', 'lstm', 'transformers'],
  'pytorch': ['pytorch', 'torch'],
  'tensorflow': ['tensorflow', 'keras', 'tensorboard'],
  'natural language processing': ['natural language processing', 'nlp', 'text mining', 'named entity recognition', 'ner'],
  'large language models': ['large language models', 'llm', 'generative ai', 'genai', 'gpt', 'langchain', 'llamaindex', 'rag', 'rlhf'],
  'computer vision': ['computer vision', 'cv', 'opencv', 'object detection', 'yolo'],
  'data science': ['data science', 'predictive analytics', 'statistical modeling', 'pandas', 'numpy'],
  'data engineering': ['data engineering', 'etl', 'elt', 'data pipelines', 'data lake'],
  'apache spark': ['apache spark', 'spark', 'pyspark', 'databricks'],
  'mlops': ['mlops', 'mlflow', 'kubeflow', 'model registry'],
  'sql': ['sql', 'structured query language'],
  'data visualization': ['data visualization', 'tableau', 'power bi', 'powerbi', 'looker', 'd3.js'],
  'apache airflow': ['apache airflow', 'airflow', 'dagster', 'prefect'],
  'statistics': ['statistics', 'statistical analysis', 'a/b testing', 'bayesian'],

  // Product & Design
  'product management': ['product management', 'prd', 'okrs', 'kpis', 'product manager'],
  'product strategy': ['product strategy', 'go to market', 'gtm', 'product discovery'],
  'ui/ux design': ['ui/ux design', 'ui/ux', 'ux design', 'ui design', 'user experience', 'user interface'],
  'figma': ['figma', 'figjam', 'sketch', 'adobe xd'],
  'design systems': ['design systems', 'design system', 'component library', 'design tokens', 'atomic design', 'storybook'],
  'user research': ['user research', 'usability testing', 'user interviews', 'journey mapping'],
  'prototyping': ['prototyping', 'wireframing', 'wireframes', 'mockups', 'framer'],
  'agile': ['agile', 'scrum', 'kanban', 'sprint planning', 'scrum master', 'jira'],
  'conversion rate optimization': ['conversion rate optimization', 'cro', 'funnel optimization'],
  'information architecture': ['information architecture', 'ia', 'site mapping'],

  // Mobile
  'react native': ['react native', 'react-native', 'expo'],
  'flutter': ['flutter', 'dart'],
  'ios development': ['ios development', 'ios', 'swift', 'swiftui', 'xcode'],
  'android development': ['android development', 'android', 'kotlin', 'jetpack compose', 'android studio'],
  'mobile architecture': ['mobile architecture', 'mvvm', 'mvi'],
  'cross-platform mobile': ['cross-platform mobile', 'cross platform mobile', 'hybrid mobile', 'capacitor', 'ionic'],

  // Sales
  'enterprise sales': ['enterprise sales', 'b2b sales', 'enterprise b2b', 'solution selling', 'meddpicc', 'meddic'],
  'salesforce': ['salesforce', 'sfdc', 'salesforce crm', 'hubspot crm'],
  'account management': ['account management', 'key accounts', 'client retention'],
  'sales prospecting': ['sales prospecting', 'outbound sales', 'lead generation', 'cold outreach'],
  'sales methodology': ['sales methodology', 'spin selling', 'sandler'],
  'sales forecasting': ['sales forecasting', 'pipeline forecasting', 'quota attainment', 'revops'],
  'contract negotiation': ['contract negotiation', 'closing deals', 'deal structuring'],
  'customer success': ['customer success', 'csm', 'client success', 'nrr', 'net revenue retention', 'gainsight', 'qbr'],

  // Marketing
  'growth marketing': ['growth marketing', 'demand generation', 'performance marketing', 'user acquisition'],
  'search engine optimization': ['search engine optimization', 'seo', 'technical seo', 'backlinks', 'ahrefs', 'semrush'],
  'paid acquisition': ['paid acquisition', 'ppc', 'google ads', 'meta ads', 'linkedin ads', 'sem', 'cac optimization'],
  'email marketing': ['email marketing', 'email automation', 'drip campaigns', 'hubspot', 'mailchimp', 'klaviyo'],
  'content marketing': ['content marketing', 'content strategy', 'copywriting', 'blogging'],
  'brand strategy': ['brand strategy', 'brand positioning', 'brand identity'],
  'marketing analytics': ['marketing analytics', 'google analytics 4', 'ga4', 'attribution modeling', 'mixpanel', 'amplitude'],
  'social media marketing': ['social media marketing', 'organic social', 'influencer marketing'],

  // Finance & Legal
  'financial modeling': ['financial modeling', 'dcf', 'discounted cash flow', 'three statement model', 'three statement models', 'lbo'],
  'fp&a': ['fp&a', 'fpa', 'financial planning and analysis', 'variance analysis', 'corporate budgeting', 'annual corporate budgeting', 'budgeting'],
  'corporate accounting': ['corporate accounting', 'gaap', 'ifrs', 'general ledger', 'month-end close'],
  'auditing': ['auditing', 'internal audit', 'external audit', 'sox', 'sox compliance', 'internal controls'],
  'erp systems': ['erp systems', 'erp system', 'sap', 'oracle netsuite', 'netsuite', 'sap s/4hana', 'workday financial'],
  'treasury management': ['treasury management', 'cash flow management', 'liquidity management', 'working capital'],
  'mergers & acquisitions': ['mergers & acquisitions', 'm&a', 'due diligence', 'valuation'],
  'corporate tax': ['corporate tax', 'tax compliance', 'transfer pricing'],
  'corporate law': ['corporate law', 'contract lifecycle management', 'clm', 'intellectual property'],
  'privacy & gdpr': ['privacy & gdpr', 'gdpr', 'ccpa', 'data privacy'],

  // HR
  'talent acquisition': ['talent acquisition', 'recruiting', 'technical recruiting', 'sourcing', 'ats management', 'greenhouse', 'lever'],
  'hr business partnering': ['hr business partnering', 'hrbp', 'strategic hr', 'people operations'],
  'hris': ['hris', 'workday', 'bamboohr', 'adp', 'gusto', 'rippling'],
  'performance management': ['performance management', 'performance reviews', '360 feedback', 'competency frameworks'],
  'compensation & benefits': ['compensation & benefits', 'total rewards', 'equity compensation', 'salary benchmarking'],
  'employee relations': ['employee relations', 'conflict resolution', 'workplace culture'],
  'diversity, equity & inclusion': ['diversity, equity & inclusion', 'dei', 'de&i', 'inclusive hiring'],
  'labor law & compliance': ['labor law & compliance', 'employment law', 'eeoc', 'flsa', 'osha', 'fmla'],

  // Operations & Verticals
  'supply chain management': ['supply chain management', 'supply chain', 'demand planning', 'inventory management'],
  'procurement': ['procurement', 'strategic sourcing', 'supplier negotiations', 'rfp', 'rfi'],
  'logistics & freight': ['logistics & freight', 'freight forwarding', '3pl', 'transportation management', 'wms'],
  'operations management': ['operations management', 'business operations', 'bizops', 'process improvement', 'sop authoring'],
  'lean six sigma': ['lean six sigma', 'six sigma', 'continuous improvement', 'kaizen', '5s', 'dmaic'],
  'healthcare administration': ['healthcare administration', 'ehr', 'emr', 'epic systems', 'cerner', 'hipaa'],
  'real estate & property': ['real estate & property', 'property management', 'commercial real estate', 'reit'],
  'education & instructional design': ['education & instructional design', 'curriculum development', 'instructional design', 'lms', 'canvas lms'],
  'customer service & support': ['customer service & support', 'helpdesk', 'zendesk', 'freshdesk', 'intercom', 'csat']
};

/**
 * Standard industry acronyms mapped to their canonical taxonomy concept.
 */
export const ACRONYM_MAP = {
  'k8s': 'kubernetes',
  'iac': 'terraform',
  'ts': 'typescript',
  'js': 'javascript',
  'ssr': 'next.js',
  'ssg': 'next.js',
  'spa': 'react',
  'mfe': 'micro-frontends',
  'eda': 'event-driven architecture',
  'soa': 'microservices',
  'rpc': 'grpc',
  'rdbms': 'postgresql',
  'psql': 'postgresql',
  'nosql': 'mongodb',
  'elk': 'elasticsearch',
  'sre': 'site reliability engineering',
  'slo': 'site reliability engineering',
  'sli': 'site reliability engineering',
  'sla': 'site reliability engineering',
  'iam': 'identity & access management',
  'rbac': 'identity & access management',
  'abac': 'identity & access management',
  'sso': 'identity & access management',
  'saml': 'identity & access management',
  'mfa': 'identity & access management',
  '2fa': 'identity & access management',
  'soc': 'siem',
  'siem': 'siem',
  'sast': 'owasp',
  'dast': 'owasp',
  'appsec': 'owasp',
  'infosec': 'cybersecurity',
  'zta': 'zero trust',
  'mttd': 'incident response',
  'mttr': 'incident response',
  'qa': 'automated testing',
  'sdet': 'quality engineering',
  'tdd': 'test driven development',
  'bdd': 'test driven development',
  'e2e': 'automated testing',
  'ml': 'machine learning',
  'ai': 'machine learning',
  'nlp': 'natural language processing',
  'ner': 'natural language processing',
  'llm': 'large language models',
  'rag': 'large language models',
  'genai': 'large language models',
  'rlhf': 'large language models',
  'cv': 'computer vision',
  'etl': 'data engineering',
  'elt': 'data engineering',
  'dag': 'apache airflow',
  'bi': 'data visualization',
  'prd': 'product management',
  'okr': 'product management',
  'okrs': 'product management',
  'kpi': 'product management',
  'kpis': 'product management',
  'gtm': 'product strategy',
  'cro': 'conversion rate optimization',
  'ia': 'information architecture',
  'a11y': 'web accessibility',
  'wcag': 'web accessibility',
  'mvvm': 'mobile architecture',
  'mvi': 'mobile architecture',
  'sdk': 'mobile architecture',
  'b2b': 'enterprise sales',
  'meddic': 'sales methodology',
  'meddpicc': 'sales methodology',
  'crm': 'salesforce',
  'sfdc': 'salesforce',
  'csm': 'customer success',
  'nrr': 'customer success',
  'arr': 'sales forecasting',
  'mrr': 'sales forecasting',
  'acv': 'sales forecasting',
  'qbr': 'customer success',
  'ebr': 'customer success',
  'seo': 'search engine optimization',
  'sem': 'paid acquisition',
  'ppc': 'paid acquisition',
  'cac': 'paid acquisition',
  'ltv': 'paid acquisition',
  'ga4': 'marketing analytics',
  'pr': 'brand strategy',
  'dcf': 'financial modeling',
  'lbo': 'financial modeling',
  'fpa': 'fp&a',
  'fp&a': 'fp&a',
  'gaap': 'corporate accounting',
  'ifrs': 'corporate accounting',
  'sox': 'auditing',
  'erp': 'erp systems',
  'm&a': 'mergers & acquisitions',
  'clm': 'corporate law',
  'ip': 'corporate law',
  'gdpr': 'privacy & gdpr',
  'ccpa': 'privacy & gdpr',
  'ats': 'talent acquisition',
  'hrbp': 'hr business partnering',
  'hris': 'hris',
  'dei': 'diversity, equity & inclusion',
  'de&i': 'diversity, equity & inclusion',
  'erg': 'diversity, equity & inclusion',
  'eeoc': 'labor law & compliance',
  'flsa': 'labor law & compliance',
  'osha': 'labor law & compliance',
  'fmla': 'labor law & compliance',
  'scm': 'supply chain management',
  'rfp': 'procurement',
  'rfi': 'procurement',
  '3pl': 'logistics & freight',
  'wms': 'logistics & freight',
  'bizops': 'operations management',
  'sop': 'operations management',
  'dmaic': 'lean six sigma',
  'ehr': 'healthcare administration',
  'emr': 'healthcare administration',
  'hipaa': 'healthcare administration',
  'reit': 'real estate & property',
  'lms': 'education & instructional design',
  'csat': 'customer service & support'
};

/**
 * 14 Core Taxonomy Domain Categories for Grouping and Reporting.
 */
export const TAXONOMY_CATEGORIES = {
  'frontend': ['react', 'typescript', 'javascript', 'next.js', 'vue', 'angular', 'svelte', 'html5', 'css3', 'tailwind css', 'sass', 'state management', 'web performance', 'web accessibility', 'micro-frontends', 'webrtc'],
  'backend': ['node.js', 'python', 'golang', 'java', 'c++', 'c#', 'rust', 'ruby on rails', 'php', 'elixir', 'graphql', 'rest api', 'grpc', 'microservices', 'distributed systems', 'event-driven architecture', 'kafka', 'rabbitmq', 'embedded systems', 'linux'],
  'databases': ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'database design', 'snowflake', 'bigquery', 'supabase', 'vector database'],
  'cloud_devops': ['kubernetes', 'docker', 'aws', 'gcp', 'azure', 'terraform', 'ansible', 'ci/cd', 'github actions', 'prometheus', 'grafana', 'datadog', 'serverless', 'service mesh', 'disaster recovery', 'site reliability engineering'],
  'cybersecurity': ['cybersecurity', 'penetration testing', 'siem', 'identity & access management', 'owasp', 'cryptography', 'incident response', 'soc2', 'iso 27001', 'nist', 'zero trust', 'network security'],
  'qa_automation': ['automated testing', 'playwright', 'cypress', 'selenium', 'api testing', 'load testing', 'test driven development', 'jest', 'mobile testing', 'quality engineering'],
  'data_ai_ml': ['machine learning', 'deep learning', 'pytorch', 'tensorflow', 'natural language processing', 'large language models', 'computer vision', 'data science', 'data engineering', 'apache spark', 'mlops', 'sql', 'data visualization', 'apache airflow', 'statistics'],
  'product_design': ['product management', 'product strategy', 'ui/ux design', 'figma', 'design systems', 'user research', 'prototyping', 'agile', 'conversion rate optimization', 'information architecture'],
  'mobile': ['react native', 'flutter', 'ios development', 'android development', 'mobile architecture', 'cross-platform mobile'],
  'sales': ['enterprise sales', 'salesforce', 'account management', 'sales prospecting', 'sales methodology', 'sales forecasting', 'contract negotiation', 'customer success'],
  'marketing': ['growth marketing', 'search engine optimization', 'paid acquisition', 'email marketing', 'content marketing', 'brand strategy', 'marketing analytics', 'social media marketing'],
  'finance_legal': ['financial modeling', 'fp&a', 'corporate accounting', 'auditing', 'erp systems', 'treasury management', 'mergers & acquisitions', 'corporate tax', 'corporate law', 'privacy & gdpr'],
  'human_resources': ['talent acquisition', 'hr business partnering', 'hris', 'performance management', 'compensation & benefits', 'employee relations', 'diversity, equity & inclusion', 'labor law & compliance'],
  'operations_verticals': ['supply chain management', 'procurement', 'logistics & freight', 'operations management', 'lean six sigma', 'healthcare administration', 'real estate & property', 'education & instructional design', 'customer service & support']
};

/**
 * Human-readable sector labels for all 14 taxonomy domains.
 */
export const TAXONOMY_CATEGORY_LABELS = {
  'frontend': 'Frontend',
  'backend': 'Backend',
  'cloud_devops': 'Cloud / DevOps',
  'data_ai_ml': 'Data & AI',
  'product_design': 'Product',
  'cybersecurity': 'Security',
  'finance_legal': 'Finance',
  'databases': 'Databases',
  'mobile': 'Mobile',
  'qa_automation': 'QA / Testing',
  'sales': 'Sales',
  'marketing': 'Marketing',
  'human_resources': 'HR / People',
  'operations_verticals': 'Operations'
};

/**
 * Normalizes text tokens by stripping surrounding punctuation while preserving #, +, ., /
 */
export function normalizeToken(token) {
  if (!token) return '';
  const str = String(token).toLowerCase().trim();
  if (str === '.net') return '.net';
  return str.replace(/^[^a-z0-9+#/.-]+|[^a-z0-9+#/.-]+$/g, '');
}

/**
 * Normalizes an acronym to its primary taxonomy concept.
 */
export function normalizeAcronym(acronym) {
  if (!acronym || typeof acronym !== 'string') return null;
  const clean = acronym.toLowerCase().trim();
  return ACRONYM_MAP[clean] || null;
}

/**
 * Returns all synonyms and related concepts for a primary concept.
 */
export function getSynonymsForConcept(concept) {
  if (!concept) return [];
  const clean = String(concept).toLowerCase().trim();
  return CONCEPT_TAXONOMY_GRAPH[clean] || [];
}

/**
 * Finds all primary concepts related to a term (bidirectional search).
 */
export function findEquivalentConcepts(term) {
  if (!term || typeof term !== 'string') return [];
  const clean = term.toLowerCase().trim();
  const equivalents = new Set();

  if (CONCEPT_TAXONOMY_GRAPH[clean]) {
    equivalents.add(clean);
  }

  if (ACRONYM_MAP[clean]) {
    equivalents.add(ACRONYM_MAP[clean]);
  }

  for (const [primary, synonyms] of Object.entries(CONCEPT_TAXONOMY_GRAPH)) {
    if (synonyms.some(s => s.toLowerCase() === clean)) {
      equivalents.add(primary);
    }
  }

  for (const [primary, aliases] of Object.entries(CONCEPT_ALIASES)) {
    if (aliases.some(a => a.toLowerCase() === clean)) {
      equivalents.add(primary);
    }
  }

  return Array.from(equivalents);
}

/**
 * Extracts distinct technical and domain terms from raw text across all 160+ taxonomy domains.
 */
export function extractTechnicalTerms(text) {
  if (!text || typeof text !== 'string') return [];
  const clean = text.toLowerCase();
  const matchedTerms = new Set();

  const searchDict = Object.keys(CONCEPT_ALIASES).length > 0 ? CONCEPT_ALIASES : CONCEPT_TAXONOMY_GRAPH;

  for (const [primary, aliases] of Object.entries(searchDict)) {
    const allKeywords = [primary, ...(aliases || [])];
    for (const kw of allKeywords) {
      // Escape special characters in keyword for regex (like c++, c#, .net, ci/cd)
      const escaped = kw.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'i');
      if (regex.test(clean)) {
        matchedTerms.add(primary);
        break;
      }
    }
  }

  return Array.from(matchedTerms);
}

/**
 * Analyzes candidate resume text against a target Job Description using
 * 3-tier semantic matching: Exact Terms, Synonym Overlap, and Conceptual Equivalence.
 * 
 * @param {object} resumeData - Candidate resume payload
 * @param {string} jobDescriptionText - Pasted Job Description
 * @returns {object} Comprehensive Semantic ATS Match Analysis
 */
export function analyzeSemanticJobMatch(resumeData, jobDescriptionText) {
  if (!jobDescriptionText || typeof jobDescriptionText !== 'string' || !jobDescriptionText.trim()) {
    return {
      matchPercentage: 0,
      matchScore: 0,
      semanticScore: 0,
      exactMatches: [],
      matchedKeywords: [],
      conceptualMatches: [],
      missingConcepts: [],
      missingKeywords: [],
      totalConceptsCount: 0,
      totalKeywords: 0,
      diagnostics: 'Please paste a job description to perform deep semantic concept matching.'
    };
  }

  // 1. Extract candidate technical vocabulary
  const resumeTextCorpus = [
    resumeData.title || '',
    resumeData.summary || '',
    ...(resumeData.skills || []),
    ...(resumeData.certifications || []),
    ...(resumeData.experience || []).flatMap(e => [e.role || '', e.company || '', ...(e.highlights || [])]),
    ...(resumeData.projects || []).flatMap(p => [p.name || '', p.description || '', ...(p.highlights || [])]),
    ...(resumeData.education || []).map(ed => `${ed.degree || ''} ${ed.school || ''}`)
  ].join(' ').toLowerCase();

  const jdConcepts = extractTechnicalTerms(jobDescriptionText);
  const candidateConcepts = extractTechnicalTerms(resumeTextCorpus);

  if (jdConcepts.length === 0) {
    return {
      matchPercentage: 0,
      matchScore: 0,
      semanticScore: 0,
      exactMatches: [],
      matchedKeywords: [],
      conceptualMatches: [],
      missingConcepts: [],
      missingKeywords: [],
      totalConceptsCount: 0,
      totalKeywords: 0,
      diagnostics: 'No standard technical or industry keywords detected in the pasted text. ATS matching requires concrete skills, tools, or domain criteria.'
    };
  }

  const candidateConceptSet = new Set(candidateConcepts);
  const exactMatches = [];
  const conceptualMatches = [];
  const missingConcepts = [];

  for (const jdConcept of jdConcepts) {
    if (candidateConceptSet.has(jdConcept)) {
      exactMatches.push({
        concept: jdConcept,
        matchedVia: 'Direct Keyword Match'
      });
      continue;
    }

    // Check conceptual graph equivalence (e.g. candidate has 'kubernetes', JD asks for 'docker')
    const relatedTerms = CONCEPT_TAXONOMY_GRAPH[jdConcept] || [];
    let foundEquivalent = null;

    // Check if resume corpus explicitly mentions any related taxonomy terms
    for (const related of relatedTerms) {
      const escaped = related.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'i');
      if (regex.test(resumeTextCorpus)) {
        foundEquivalent = related;
        break;
      }
    }

    // Bidirectional check: check if any candidate concept relates to jdConcept in the taxonomy graph
    if (!foundEquivalent) {
      for (const candConcept of candidateConceptSet) {
        const candTaxonomy = CONCEPT_TAXONOMY_GRAPH[candConcept] || [];
        if (
          candTaxonomy.includes(jdConcept) ||
          candTaxonomy.some(t => relatedTerms.includes(t)) ||
          (CONCEPT_TAXONOMY_GRAPH[jdConcept] && CONCEPT_TAXONOMY_GRAPH[jdConcept].includes(candConcept))
        ) {
          foundEquivalent = candConcept;
          break;
        }
      }
    }

    if (foundEquivalent) {
      conceptualMatches.push({
        concept: jdConcept,
        matchedVia: foundEquivalent,
        note: `Satisfied conceptually via related skill "${foundEquivalent}"`
      });
    } else {
      missingConcepts.push(jdConcept);
    }
  }

  // Calculate weighted semantic score
  // Direct matches = 1.0 weight, Conceptual equivalence = 0.75 weight
  const totalWeight = jdConcepts.length;
  const earnedWeight = (exactMatches.length * 1.0) + (conceptualMatches.length * 0.75);
  const semanticPercentage = totalWeight > 0 ? Math.min(100, Math.round((earnedWeight / totalWeight) * 100)) : 0;
  const exactList = exactMatches.map(m => m.concept);

  return {
    matchPercentage: semanticPercentage,
    matchScore: semanticPercentage,
    semanticScore: semanticPercentage,
    exactMatches: exactList,
    matchedKeywords: exactList,
    conceptualMatches,
    missingConcepts,
    missingKeywords: missingConcepts,
    totalConceptsCount: totalWeight,
    totalKeywords: totalWeight,
    diagnostics: semanticPercentage >= 80
      ? `Strong ATS Semantic Alignment (${semanticPercentage}%). Candidate profile directly satisfies core requirements and technical competencies.`
      : `Moderate ATS Gap (${semanticPercentage}% Match). Consider adding missing core competencies (${missingConcepts.slice(0, 4).join(', ')}) to your skills or experience bullets.`
  };
}
