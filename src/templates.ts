export type Audience = 'Everyone' | 'Teachers' | 'Authors' | 'Public service' | 'Technical';

export type DiagramTemplate = {
  id: string;
  name: string;
  audience: Exclude<Audience, 'Everyone'>;
  purpose: string;
  type: string;
  source: string;
};

export const templates: DiagramTemplate[] = [
  {
    id: 'lesson-flow',
    name: 'Lesson flow',
    audience: 'Teachers',
    purpose: 'Explain a lesson, classroom activity, or learning decision.',
    type: 'Flowchart',
    source: `flowchart TD
    A["Question or topic"] --> B["Introduce the idea"]
    B --> C{"Do learners understand?"}
    C -- "Yes" --> D["Practice or activity"]
    C -- "Not yet" --> E["Try another example"]
    E --> C
    D --> F["Reflect and assess"]`,
  },
  {
    id: 'concept-map',
    name: 'Concept map',
    audience: 'Teachers',
    purpose: 'Break a subject into ideas, examples, evidence, and questions.',
    type: 'Mind map',
    source: `mindmap
  root((Main topic))
    Key idea 1
      Example
      Evidence
    Key idea 2
      Example
    Questions to explore`,
  },
  {
    id: 'story-timeline',
    name: 'Story timeline',
    audience: 'Authors',
    purpose: 'Plan a story, chapter, biography, article, or historical narrative.',
    type: 'Timeline',
    source: `timeline
    title Story or chapter timeline
    section Beginning
      Setup : Introduce setting and characters
      Trigger : Something changes
    section Middle
      Challenge : Stakes rise
      Choice : Main decision
    section End
      Result : Consequence
      Reflection : Meaning`,
  },
  {
    id: 'article-structure',
    name: 'Article structure',
    audience: 'Authors',
    purpose: 'See the argument of an article or book section before writing it.',
    type: 'Flowchart',
    source: `flowchart LR
    A["Reader's question"] --> B["Context"]
    B --> C["Main claim"]
    C --> D["Evidence 1"]
    C --> E["Evidence 2"]
    D --> F["Implication"]
    E --> F
    F --> G["Conclusion or next question"]`,
  },
  {
    id: 'public-service-path',
    name: 'Public service path',
    audience: 'Public service',
    purpose: 'Explain how a resident finds, applies for, and receives a service.',
    type: 'Flowchart',
    source: `flowchart LR
    A["Resident needs help"] --> B["Find the right service"]
    B --> C["Check eligibility"]
    C --> D{"Eligible?"}
    D -- "Yes" --> E["Submit request"]
    D -- "No" --> F["Show alternatives"]
    E --> G["Receive status updates"]
    G --> H["Service completed"]`,
  },
  {
    id: 'community-journey',
    name: 'Community journey',
    audience: 'Public service',
    purpose: 'Map a participant experience and expose frustrating steps.',
    type: 'User journey',
    source: `journey
    title Community program participant journey
    section Discover
      Learn about program: 4: Resident
      Check eligibility: 3: Resident
    section Apply
      Complete application: 2: Resident
      Get confirmation: 4: Agency
    section Participate
      Attend service: 5: Resident, Staff
      Give feedback: 4: Resident`,
  },
  {
    id: 'system-request',
    name: 'System request',
    audience: 'Technical',
    purpose: 'Show how a request moves between a user, application, API, and data store.',
    type: 'Sequence',
    source: `sequenceDiagram
    actor User
    participant Web as Web app
    participant API
    participant DB as Database
    User->>Web: Submit request
    Web->>API: POST /request
    API->>DB: Save request
    DB-->>API: Saved
    API-->>Web: 201 Created
    Web-->>User: Show confirmation`,
  },
  {
    id: 'system-architecture',
    name: 'System architecture',
    audience: 'Technical',
    purpose: 'Show the main services and resources in a small application architecture.',
    type: 'Architecture',
    source: `architecture-beta
    group app(cloud)[Application]
    service web(server)[Web app] in app
    service api(server)[API] in app
    service db(database)[Database] in app
    web:R --> L:api
    api:R --> L:db`,
  },
  {
    id: 'project-plan',
    name: 'Project plan',
    audience: 'Technical',
    purpose: 'Turn a small delivery plan into a clear schedule.',
    type: 'Gantt',
    source: `gantt
    title Simple project plan
    dateFormat YYYY-MM-DD
    axisFormat %b %d
    section Prepare
      Research :done, research, 2026-09-01, 5d
      Draft :active, draft, after research, 7d
    section Publish
      Review :review, after draft, 3d
      Publish :milestone, publish, after review, 0d`,
  },
];

export const audiences: Audience[] = ['Everyone', 'Teachers', 'Authors', 'Public service', 'Technical'];
