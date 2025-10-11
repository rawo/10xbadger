1. Promoption eligiblity has a fixed set of rules, composed of number of badges of specific category, and bage level.
each badge has following characteristic: category, level.
badge levels: gold, silver, bronze
badge categories: technical, organizational, softskilled
Example of requirements need for promotion to senior level engineer level 3
6 silver badges from category technical
1 gold badge from any of defined categories
4 silver badge from any of defined categories

2. lifecycle for badge in catalog has two states: active, inactive
Inactive badge cannot be used in promotions. It is consider as read-only for historical purposes only.
lifecycle for badge issued for acceptance: new, issued, rejected, accepted, used in promotion
Rules for using badges in promotions:
 - only accepted badges can be used in promotions
 - one accepted badge can be used in only one promotion at a time
 - if accepted badge is used in promotion that is accepted and executed, then this badge can not be used in other promotions

minimal metadata for badge in catalog: createdAt, createdBy, deactivatedAt, status[active,inactive]
minimal metadata for badge used by engineer: createdAt, createdBy, status[new, issued, rejected, accepted,used in promotion], reference to badge in catalog

3. There is no need for multiple admin levels, or hierarchial access levels. There are only two levels for now: administrator, standard user (engineer)
Administrator is able to manage catalog of badges. However, administrator is also a standard user, so it means that administrator has two contexts available: admin, standard user.
But you can consider a multitenancy, as an option. However this should not be part of the MVP.
I strongly agree that RBAC system should be used, so that it is open for future additions.

4. Let's use badge appplication instead of issuerance, since this is a better wording in context of the Badger software.
Badge applicant (the standard user) must provide following: 
- date of application, 
- date of fullfilling the badge criteria
- reason of application - this would be an descriptive evidence of fullfiling badge criteria to be reviewed by admin

5. Exact search crieria: 
- by category, 
- by level, 
- full-text search - badge title only for MVP
- createdAt
Rule: all matching is enough for MVP, no other logical operations
No need for search by status since only active baddges are available in the catalog

6. The time window from inital announcement of Badger availability would be a 2 calendar months.
At that time it should be verified if the success criteria are reached.
The source of data: 
- current employees catalog - provided manually by company administrators
- number of employees registered in the system
- no new badge applicants in existing solution - global excel file 

7. Not in the MVP, but later on as extensions. Notifications may include: in Badger app notifications, email notifications.

8. Yes there is an existing excel and confluance data source.
The volume of excel lines is around 10000, columns 10.
The volume of badge catalog in conflunence: around 100 badges, each with 1 to 3 pages of content, A4 format. No need to import page comments or history.

9. For current context:
- 300 active employees
- around 100 badges
- up to 13 promotion levels in each of the promotion path
- 3 promotion paths: technical, financial, management

10. A must-have is mentioned in the 'minimum viabale features (MVP)' section of product description. Access to backend, fronend, qa engineers. Timeline up to 12 weeks.