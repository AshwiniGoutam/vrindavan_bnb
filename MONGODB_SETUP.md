# MongoDB setup

This version does not use Prisma or PostgreSQL. It uses the official MongoDB Node.js driver directly.

## 1. Create MongoDB Atlas database

Create a MongoDB Atlas cluster and a database named:

`vrindavan_holiday_inn`

Create a database user and allow your development IP in Network Access.

## 2. Configure `.env`

Copy `.env.example` to `.env` and set:

```env
MONGODB_URI="mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/vrindavan_holiday_inn?retryWrites=true&w=majority"
MONGODB_DB="vrindavan_holiday_inn"
```

If your URI contains special characters in the username/password, URL-encode them.

## 3. Install

```powershell
npm install
```

## 4. Create the admin user

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then:

```powershell
npm run db:seed
```

## 5. Start

```powershell
npm run dev
```

The application creates the required MongoDB indexes when the database is first used. No Prisma schema, migration or PostgreSQL service is required.

## Existing PostgreSQL data

This project conversion changes the application database layer; it does not automatically migrate records from an old PostgreSQL database. If the old database contains real bookings/users/stays that must be preserved, export and transform those records before production use.
