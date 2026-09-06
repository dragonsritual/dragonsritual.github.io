DRAGONSRITUAL — PASS 33
DRAGON TV IS ALREADY ON

THIS IS THE CORE TV MODEL.

WHEN A VISITOR CLICKS TV
They do NOT first get:
- a landing-page headline
- a WATCH button
- a list of channels they must choose from

They get a television that is already on.

TOP OF /TV/
LEFT:
- full-size playing signal
- real video if a published video_url exists
- otherwise an automatically rotating house-broadcast visual
- current title
- current creator/channel
- follow current creator
- previous / pause / sound / next
- automatic progress / rotation

RIGHT:
- NOW & NEXT sidebar
- the current show
- the next few programs
- click any queue item to tune immediately
- MY TV / TOP / NEW / DISCOVER tuner
- Following access when signed in

NO EMPTY "SIGNAL IS WAITING" EXPERIENCE
If the database has zero published creator videos, Dragon TV still turns on.

It rotates the four HOUSE PROGRAMS:
- Dragon Gaming
- Dragon Drawing
- Films & Features
- Dragon Live

Those are visual house broadcasts until real media exists.
They are explicitly not pretending to be uploaded videos.

AS REAL VIDEOS ARRIVE
The same top signal automatically starts using:
dr_tv_videos.video_url
and the channel / following system from PASS 31.

THE SCROLL EXPERIENCE
Only AFTER the television is already playing does the visitor reach:
- House Programming
- House Channels
- New From Your Channels
- People Worth Watching
- Your Channel Mix
- From the Vault
- Creator Access

That means "TV" behaves like TV first, website second.

FOLLOWING
Following creators modifies MY TV.
One recent video per followed creator gets early rotation priority so one prolific creator cannot dominate.
Discovery and Dragon house programming can remain part of the wider network experience.

NO NEW SQL
Uses PASS 31 tables and SQL.

INSTALL
Merge PASS 33 over current repository.
npm run dev
Open /tv/
