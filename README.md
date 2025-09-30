# Exhibition Management System – Overview Analytics (Backend)

## My Contribution
I developed the **backend for the Overview Analytics module** of the Exhibition Management System.  
This module provides insights into visitor activity and building usage within the exhibition.

### Features Implemented
- **Total Attendees** – Returns the total number of visitors across all buildings.
- **Check-ins** – Tracks and retrieves the number of visitor check-ins.
- **Average Time Spent** – Calculates the average time a visitor spends inside a building.
- **Repeat Visitors** – Identifies and counts visitors who visited more than once.
- **Top 3 Buildings** – Ranks and retrieves the top three most visited buildings.
- **Bar Chart Data** – Provides structured data for a bar chart visualization showing total visitors per building.

### Technical Details
- **Role:** Backend Development  
- **Responsibilities:** Designing APIs, implementing business logic, and ensuring data retrieval for analytics.  
- **Data Flow:** Backend APIs supply JSON data which is consumed by the frontend for visualization and reporting.

### Example API Outputs
- `GET /analytics/total-visitors` → `{ "totalVisitors": 1200 }`
- `GET /analytics/top-buildings` → `[ { "building": "A", "visitors": 350 }, ... ]`
- `GET /analytics/avg-time` → `{ "averageMinutes": 42 }`

---

 This analytics backend ensures exhibition managers can monitor visitor patterns and make data-driven decisions.
