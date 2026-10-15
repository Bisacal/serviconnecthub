# Service Connect Hub

SERVICONNECT — MASTER PROJECT PROMPT



You are a senior full-stack software engineer, product designer, database architect, UX/UI designer, and security-conscious developer.



Build a modern, professional, responsive web application called SERVICONNECT.



PLATFORM DESCRIPTION



SERVICONNECT is an online service marketplace that connects clients who need professional services with verified service providers.



Clients should be able to search for service providers based on:



- Service category

- Location

- Price

- Rating

- Experience

- Availability



The platform will initially target Nigeria, starting with Abuja and surrounding areas, but the architecture must be scalable to support all Nigerian states and international expansion in the future.



The platform should support multiple types of professionals, including:



- Home lesson tutors

- Mechanics

- Solar installers

- Electricians

- Plumbers

- Painters

- Carpenters

- Cleaners

- Computer technicians

- Web developers

- Graphic designers

- Photographers

- Caterers

- Event planners

- Fashion designers



The primary goal is to make it easy for clients to find trusted professionals without physically searching for them.



---



PLATFORM SLOGAN



Find Trusted Professionals. Get Things Done.



---



USER ROLES



The platform must support three primary user roles:



1. Client

2. Service Provider

3. Administrator



The application must use a secure role-based access control system.



Users must only access the dashboard and features assigned to their role.



---



DESIGN REQUIREMENTS



Create a modern, clean, professional, trustworthy, and user-friendly interface.



The design should feel like a modern technology marketplace.



Visual Style



Use:



- Clean layout

- Modern typography

- Responsive design

- Professional cards

- Clear call-to-action buttons

- Rounded corners

- Subtle shadows

- Good spacing

- Accessible contrast

- Mobile-first design



Suggested Brand Colors



Primary color:

Deep Blue



Secondary color:

Green



Background:

White and light neutral colors



Use colors consistently throughout the platform.



Do not create an overly complicated or crowded design.



---



TECHNICAL ARCHITECTURE



Build the application using:



- React

- TypeScript

- Tailwind CSS

- Supabase

- PostgreSQL



Use Supabase for:



- Authentication

- PostgreSQL database

- File storage

- Row Level Security

- Backend functionality where required



The application must be structured cleanly so that it can scale in the future.



---



PUBLIC WEBSITE



Create the following public pages:



1. Homepage

2. Services

3. Service Categories

4. Service Provider Directory

5. Provider Profile

6. Search Results

7. How It Works

8. About Us

9. Contact Us

10. FAQ

11. Blog

12. Individual Blog Article



---



HOMEPAGE REQUIREMENTS



Create a professional homepage containing:



Hero Section



Headline:



Find Trusted Professionals Near You



Description:



Find reliable tutors, mechanics, electricians, solar installers, plumbers and many other trusted professionals.



Include two primary buttons:



- Find a Service

- Become a Provider



Include a prominent search component.



Search fields:



- What service do you need?

- Location



Include a Search button.



---



SERVICE CATEGORIES



Display popular service categories using modern cards.



Initial categories:



- Education and Tutoring

- Automotive Services

- Solar and Energy

- Electrical Services

- Plumbing

- Painting

- Cleaning

- Carpentry

- Technology Services

- Creative Services

- Fashion and Beauty

- Events and Catering



Each category must link to a category page.



---



HOW IT WORKS



Create separate explanations for clients and service providers.



For Clients



1. Search for a service.

2. Find a professional.

3. Contact or request a service.

4. Get your job done.

5. Leave a review.



For Service Providers



1. Create an account.

2. Build your professional profile.

3. Add your services.

4. Receive client requests.

5. Grow your business.



---



FEATURED PROVIDERS



Create a section for featured providers.



Each provider card should display:



- Profile image

- Name

- Profession

- Location

- Rating

- Starting price

- Verification badge where applicable



Use realistic placeholder data initially.



---



WHY CHOOSE SERVICONNECT



Include:



- Easy to Use

- Find Professionals Nearby

- Verified Providers

- Transparent Pricing

- Ratings and Reviews



---



OTHER HOMEPAGE SECTIONS



Include:



- Testimonials

- Call to action for service providers

- FAQ preview

- Footer



---



AUTHENTICATION



Create secure authentication pages for:



- Sign Up

- Login

- Forgot Password

- Reset Password



During registration, allow users to choose:



- Client

- Service Provider



Do not allow public users to register as administrators.



Store the user role securely in the database.



Create proper role-based redirection after login.



Clients should be redirected to the Client Dashboard.



Providers should be redirected to the Provider Dashboard.



Administrators should be redirected to the Admin Dashboard.



---



CLIENT FEATURES



The Client Dashboard must eventually include:



- Dashboard Overview

- Find Services

- Search Providers

- Service Requests

- Bookings

- Saved Providers

- Messages

- Reviews

- Payments

- Notifications

- Profile Settings



For Phase 1, create the structure and navigation for these features but only fully implement the features specified in later development phases.



---



SERVICE PROVIDER FEATURES



The Provider Dashboard must eventually include:



- Dashboard Overview

- Professional Profile

- Services

- Pricing

- Portfolio

- Availability

- Service Requests

- Bookings

- Messages

- Earnings

- Reviews

- Subscription

- Verification

- Notifications

- Profile Settings



For Phase 1, create the structure and navigation for these features but only fully implement the features specified in later development phases.



---



ADMIN FEATURES



The Admin Dashboard must eventually include:



- Dashboard Overview

- User Management

- Client Management

- Provider Management

- Provider Verification

- Service Categories

- Services

- Service Requests

- Bookings

- Reviews

- Payments

- Subscriptions

- Advertising

- Blog Management

- FAQ Management

- Contact Messages

- Complaints and Disputes

- Notifications

- Location Management

- Analytics

- Admin Management

- Site Settings



For Phase 1, create the architecture and navigation but do not attempt to build all advanced functionality immediately.



---



SECURITY REQUIREMENTS



Implement security best practices.



Use:



- Supabase authentication

- Secure password handling

- Row Level Security

- Role-based authorization

- Protected dashboard routes

- Secure database access policies



Users must not be able to:



- Access another user's private dashboard

- Modify another user's profile

- Access administrator features

- Modify records they do not own



Do not expose sensitive information publicly.



---



DATABASE ARCHITECTURE



Prepare the application architecture for the following major entities:



- Users

- Profiles

- Client Profiles

- Provider Profiles

- Service Categories

- Service Subcategories

- Provider Services

- Service Requests

- Bookings

- Reviews

- Messages

- Payments

- Subscriptions

- Verification Documents

- Provider Portfolios

- Notifications

- Saved Providers

- Locations

- Complaints

- Blog Posts

- FAQs



Use proper relationships and foreign keys.



Use UUID primary keys.



Include created_at and updated_at timestamps where appropriate.



---



IMPORTANT DEVELOPMENT RULES



This is a large application.



Do not attempt to build all advanced features in one response.



Build the platform in controlled phases.



Before implementing each major feature:



1. Review the existing architecture.

2. Preserve existing functionality.

3. Avoid unnecessary redesign of completed pages.

4. Reuse existing components.

5. Keep the database schema organized.

6. Maintain mobile responsiveness.

7. Test the functionality.



Do not use mock authentication once Supabase authentication is connected.



Do not expose private API keys.



Do not create insecure admin access.



---



PHASE 1 GOAL



For the first phase, focus on:



1. Project architecture

2. Professional UI design

3. Public website

4. Service categories

5. Provider directory interface

6. Provider profile interface

7. Authentication interface

8. Dashboard layouts

9. Responsive navigation

10. Basic Supabase project preparation



Use placeholder data where database functionality has not yet been implemented.



Do not implement payment processing yet.



Do not implement advanced messaging yet.



Do not implement commissions yet.



First create a polished and fully responsive foundation for SERVICONNECT.



Before making major assumptions about functionality, keep the system modular and easy to extend in future phases.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://serviconnecthub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4bf48007-754f-41cf-b340-6652bf31a5f2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
