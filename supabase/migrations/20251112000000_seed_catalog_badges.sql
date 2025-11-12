--
-- migration: seed catalog badges with sample data
-- created: 2025-11-12 00:00:00 utc
-- purpose: populate catalog_badges table with sample badges for development and testing
-- affected: catalog_badges
-- special notes:
--  - creates 5 badges per category (technical, organizational, softskilled)
--  - each badge has all 3 levels (gold, silver, bronze)
--  - total of 45 badges (5 categories × 3 levels × 3 categories)
--  - all badges are set to 'active' status
--  - created_by is null as these are system-seeded badges
--

begin;

-- -------------------------------
-- technical badges
-- -------------------------------

-- badge 1: system architecture
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'System Architecture - Gold', 'Demonstrates exceptional ability to design and implement scalable, resilient system architectures. Led architectural decisions for critical systems serving millions of users.', 'technical', 'gold', 'active', 1),
  (gen_random_uuid(), 'System Architecture - Silver', 'Demonstrates strong understanding of system design principles. Contributed to architecture decisions and implemented complex distributed systems.', 'technical', 'silver', 'active', 1),
  (gen_random_uuid(), 'System Architecture - Bronze', 'Shows foundational knowledge of system architecture. Participated in design discussions and implemented well-architected components.', 'technical', 'bronze', 'active', 1);

-- badge 2: database optimization
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Database Optimization - Gold', 'Expert in database performance tuning and optimization. Achieved significant performance improvements (>50%) on production databases handling high-scale workloads.', 'technical', 'gold', 'active', 1),
  (gen_random_uuid(), 'Database Optimization - Silver', 'Proficient in query optimization and indexing strategies. Improved database performance through effective use of indexes and query rewrites.', 'technical', 'silver', 'active', 1),
  (gen_random_uuid(), 'Database Optimization - Bronze', 'Understands basic database optimization techniques. Applied indexing and query optimization in development projects.', 'technical', 'bronze', 'active', 1);

-- badge 3: api design
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'API Design Excellence - Gold', 'Designed and documented comprehensive API systems used by multiple teams. Established API standards and best practices across the organization.', 'technical', 'gold', 'active', 1),
  (gen_random_uuid(), 'API Design Excellence - Silver', 'Created well-designed RESTful APIs with proper documentation. Applied API design patterns and versioning strategies effectively.', 'technical', 'silver', 'active', 1),
  (gen_random_uuid(), 'API Design Excellence - Bronze', 'Developed functional APIs following REST principles. Implemented basic CRUD operations with appropriate HTTP methods.', 'technical', 'bronze', 'active', 1);

-- badge 4: security champion
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Security Champion - Gold', 'Led security initiatives and established security best practices. Performed security audits and remediated critical vulnerabilities in production systems.', 'technical', 'gold', 'active', 1),
  (gen_random_uuid(), 'Security Champion - Silver', 'Implemented security measures including authentication, authorization, and data encryption. Conducted code reviews with security focus.', 'technical', 'silver', 'active', 1),
  (gen_random_uuid(), 'Security Champion - Bronze', 'Applied basic security practices including input validation, HTTPS, and secure password handling in applications.', 'technical', 'bronze', 'active', 1);

-- badge 5: testing mastery
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Testing Mastery - Gold', 'Established comprehensive testing strategies including unit, integration, and E2E tests. Achieved >90% code coverage and implemented automated testing pipelines.', 'technical', 'gold', 'active', 1),
  (gen_random_uuid(), 'Testing Mastery - Silver', 'Created effective test suites with good coverage. Implemented both unit tests and integration tests for critical features.', 'technical', 'silver', 'active', 1),
  (gen_random_uuid(), 'Testing Mastery - Bronze', 'Wrote unit tests for code contributions. Understands testing fundamentals and TDD principles.', 'technical', 'bronze', 'active', 1);

-- -------------------------------
-- organizational badges
-- -------------------------------

-- badge 1: project leadership
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Project Leadership - Gold', 'Led multiple cross-functional projects to successful completion. Managed project timelines, stakeholder communications, and team coordination for complex initiatives.', 'organizational', 'gold', 'active', 1),
  (gen_random_uuid(), 'Project Leadership - Silver', 'Successfully led a significant project from inception to delivery. Coordinated with team members and managed project milestones effectively.', 'organizational', 'silver', 'active', 1),
  (gen_random_uuid(), 'Project Leadership - Bronze', 'Participated in project planning and execution. Took ownership of project tasks and contributed to team success.', 'organizational', 'bronze', 'active', 1);

-- badge 2: process improvement
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Process Improvement - Gold', 'Identified and implemented organization-wide process improvements that significantly increased efficiency. Documented and evangelized new processes across teams.', 'organizational', 'gold', 'active', 1),
  (gen_random_uuid(), 'Process Improvement - Silver', 'Streamlined team workflows and implemented process improvements. Measured and demonstrated positive impact on team productivity.', 'organizational', 'silver', 'active', 1),
  (gen_random_uuid(), 'Process Improvement - Bronze', 'Suggested process improvements and helped implement team workflow enhancements.', 'organizational', 'bronze', 'active', 1);

-- badge 3: documentation excellence
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Documentation Excellence - Gold', 'Created comprehensive technical documentation that serves as the standard for the organization. Established documentation practices and templates.', 'organizational', 'gold', 'active', 1),
  (gen_random_uuid(), 'Documentation Excellence - Silver', 'Wrote clear, well-organized documentation for projects and systems. Documentation is regularly used and referenced by team members.', 'organizational', 'silver', 'active', 1),
  (gen_random_uuid(), 'Documentation Excellence - Bronze', 'Documented code and features with clear README files and inline comments. Maintained up-to-date documentation for areas of responsibility.', 'organizational', 'bronze', 'active', 1);

-- badge 4: cross-team collaboration
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Cross-Team Collaboration - Gold', 'Built strong relationships across multiple teams and departments. Facilitated collaboration that led to significant organizational outcomes.', 'organizational', 'gold', 'active', 1),
  (gen_random_uuid(), 'Cross-Team Collaboration - Silver', 'Worked effectively with other teams to achieve shared goals. Contributed to cross-functional initiatives and knowledge sharing.', 'organizational', 'silver', 'active', 1),
  (gen_random_uuid(), 'Cross-Team Collaboration - Bronze', 'Collaborated with members from other teams. Participated in cross-team meetings and initiatives.', 'organizational', 'bronze', 'active', 1);

-- badge 5: innovation advocate
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Innovation Advocate - Gold', 'Championed innovative solutions that were adopted organization-wide. Introduced new technologies or methodologies that significantly improved outcomes.', 'organizational', 'gold', 'active', 1),
  (gen_random_uuid(), 'Innovation Advocate - Silver', 'Proposed and implemented innovative solutions to team challenges. Experimented with new technologies and shared learnings with the team.', 'organizational', 'silver', 'active', 1),
  (gen_random_uuid(), 'Innovation Advocate - Bronze', 'Showed willingness to try new approaches and technologies. Contributed ideas during brainstorming sessions.', 'organizational', 'bronze', 'active', 1);

-- -------------------------------
-- softskilled badges
-- -------------------------------

-- badge 1: mentorship
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Mentorship Excellence - Gold', 'Established formal mentorship programs and mentored multiple engineers to career advancement. Recognized as a go-to mentor within the organization.', 'softskilled', 'gold', 'active', 1),
  (gen_random_uuid(), 'Mentorship Excellence - Silver', 'Mentored team members and helped them grow their technical and professional skills. Provided regular guidance and support.', 'softskilled', 'silver', 'active', 1),
  (gen_random_uuid(), 'Mentorship Excellence - Bronze', 'Supported new team members through onboarding. Shared knowledge and helped colleagues learn new skills.', 'softskilled', 'bronze', 'active', 1);

-- badge 2: communication mastery
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Communication Mastery - Gold', 'Exceptional communicator who effectively conveys complex technical concepts to diverse audiences. Presented at conferences or led organization-wide technical discussions.', 'softskilled', 'gold', 'active', 1),
  (gen_random_uuid(), 'Communication Mastery - Silver', 'Communicates clearly in written and verbal forms. Presented technical topics to team and stakeholders effectively.', 'softskilled', 'silver', 'active', 1),
  (gen_random_uuid(), 'Communication Mastery - Bronze', 'Communicates effectively with team members. Writes clear documentation and participates actively in discussions.', 'softskilled', 'bronze', 'active', 1);

-- badge 3: problem solving
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Problem Solving Expert - Gold', 'Consistently tackles the most challenging technical problems. Developed creative solutions to complex issues that others could not solve.', 'softskilled', 'gold', 'active', 1),
  (gen_random_uuid(), 'Problem Solving Expert - Silver', 'Effectively debugs and resolves complex technical issues. Applies systematic approaches to problem-solving.', 'softskilled', 'silver', 'active', 1),
  (gen_random_uuid(), 'Problem Solving Expert - Bronze', 'Independently resolves technical issues. Uses debugging tools and techniques effectively.', 'softskilled', 'bronze', 'active', 1);

-- badge 4: adaptability
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Adaptability Champion - Gold', 'Thrives in rapidly changing environments. Successfully pivoted between different technologies, projects, and priorities while maintaining high quality.', 'softskilled', 'gold', 'active', 1),
  (gen_random_uuid(), 'Adaptability Champion - Silver', 'Adapts well to changing requirements and priorities. Learned new technologies quickly when needed for projects.', 'softskilled', 'silver', 'active', 1),
  (gen_random_uuid(), 'Adaptability Champion - Bronze', 'Shows flexibility when priorities change. Willing to learn new tools and approaches.', 'softskilled', 'bronze', 'active', 1);

-- badge 5: leadership
insert into catalog_badges (id, title, description, category, level, status, version)
values
  (gen_random_uuid(), 'Technical Leadership - Gold', 'Demonstrated strong leadership by driving technical direction, influencing architecture decisions, and inspiring team members to achieve excellence.', 'softskilled', 'gold', 'active', 1),
  (gen_random_uuid(), 'Technical Leadership - Silver', 'Took leadership on projects and technical initiatives. Made key decisions and guided team members.', 'softskilled', 'silver', 'active', 1),
  (gen_random_uuid(), 'Technical Leadership - Bronze', 'Showed leadership potential by taking initiative on tasks and helping guide junior team members.', 'softskilled', 'bronze', 'active', 1);

commit;

-- migration complete
-- created 45 badge catalog entries:
--   15 technical badges (5 types × 3 levels)
--   15 organizational badges (5 types × 3 levels)
--   15 softskilled badges (5 types × 3 levels)
