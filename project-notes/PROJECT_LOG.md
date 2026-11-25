# Project log

**Team name:** Just Noah Williams
**Startup name:** Critical Fail Cavern
**Live site link:** TBA

---

## Work sessions

Copy this block for each session.

### Session — [Novemeber 16th, 2026] — driver: [Noah]

- **Goal for this session:** Develop an app idea for startup. 
- **Key prompts we gave Copilot** (paste the important ones):
  1. N/A
  2. N/A
- **What worked:** A couple potential ideas were created,(D&D Inititive tracker app, Bike registration app), after learning about bike index, D&D inititive tracker was chosen 
- **What broke, and how we fixed it:** N/A
- **Committed?** yes / no — commit message: No changes were committed

---

### Session — [Novemeber 17th, 2026] — driver: [Noah]

- **Goal for this session:** Develop first itteration of the app
- **Key prompts we gave Copilot** (paste the important ones):
  1. create a website called critical fail cavern where it has an inititive tracker, and a data base for minis figures.
  2. make the colours navy blue and gold, with a stone background the base background.
  3. fix the inititive roll, the roll should not exceed 20,
  4. test adding mini figures to the data base and check for errors.
- **What worked:** website was created,with proper colors, and initiative tracker
- **What broke, and how we fixed it:**  automatic inititive roll, rolled over 20, was fixed by adding a prompt
- **Committed?** yes / no — commit message: Was intended to commit, but commit was missed and lost this sessions worth of data

---
### Session — [Novemeber 23rd, 2026] — driver: [Noah]

- **Goal for this session:** develop the base of the app for a second time
- **Key prompts we gave Copilot** (paste the important ones):
  1. Create an all in one website called critical fail cavern that has a main dashboard, a database which holds minis, an inititive tracker for D&D, a battle map with players markers, and a market place where you can buy or sell minis
  2. Create a pricing teir system  where The base website app will be free but includes a database limit of 20 mini figures and two marketplace listings, while “Creator” plan (4.99 CAD)would allow up to 100 mini figures and ten marketplace listings, and the “creator pro” plan (12.99 CAD) would have unlimited marketplace and figure counts but would have the largest subscription.
- **What worked:** Created website, Database setup, inititive, battle map, marketplace, simulated tier and logins
- **What broke, and how we fixed it:** nothing broke
- **Committed?** yes / no — commit message:  yes it was commited : Initial Creation of website using mini DB idea.

---
### Session — [Novemeber 24th, 2026] — driver: [Noah]

- **Goal for this session:** Change the theme of website from base white to a theme
- **Key prompts we gave Copilot** (paste the important ones):
  1. change style of website to use grey blue gold as colours and use a skyrim styled cavern as a background
  2. change database and collection should not be seperate pages
  3. If signed out of account state its signed out in membership.
- **What worked:** UI was modified correctly,
- **What broke, and how we fixed it:** N/A
- **Committed?** yes / no — commit message: yes - Refactor membership plans and enhance UI elements for improved user experience

---
### Session — [Novemeber 24th, 2026] — driver: [Noah]

- **Goal for this session:**  Dashboard,Battle map,and account logistics ironed out
- **Key prompts we gave Copilot** (paste the important ones):
  1. when not signed in the counts on dashboard, activity, inititive tracker and marketplace postings should be empty
  2. if not signed in inititive tracker, and database is reset to empty
  3. Battle map should be empty if not signed in
  4. Marketplace should always use account display name for seller name
  5. Make demo account be named "BSAD 281 Demo account" and when a ffictional local profiles is attempted to be made, prompt a message saying to use the BSAD demo account 
  6. Remove ability to sign into local fictional profile
  7. provide option to make map fuil screen
  8. Have the player markers not include the players but create a legend 
  9. move legend to vertical on right side of map, and ensure it opens in full screen
  10. move legend to side of map so its not on surface but still opens full screen

- **What worked:** account login enables features to display information, marketplace now uses account name for seller name, demo account fully set up, generated a base battlemap, legend and added full screen capability.
- **What broke, and how we fixed it:** 
- **Committed?** yes / no — commit message: yes - Refactor battle map functionality to include built-in grasslands map option, enhance UI for account management, and implement full-screen capabilities. Update marketplace to use account display names and improve collection management for signed-in users.

---
### Session — [Novemeber 24th, 2026] — driver: [Noah]

- **Goal for this session:** Initiative tracker and battle map completion
- **Key prompts we gave Copilot** (paste the important ones):
  1. when battle map open in full screen, impliment the inititive tracker by showing  whos turn it is and end turn option
  2. Allow option to modify HP and and Armour class in the fullscreen
  3. make inititive player addition a secondary menu that opens when you select "Add Player"
  4. create a seperate button to open creature menu
  5. put add creature button to the right of add player
  6. make a secondary "are you sure"  prompt when you attempt to delete
- **What worked:**  Inititive tracker and fullscreen battle map management created, and improved UI management
- **What broke, and how we fixed it:** N/A
- **Committed?** yes / no — commit message: yes - Implement initiative tracker and armor class management in fullscreen mode; enhance combatant forms with armor class input and improve UI for adding players and creatures.

---
### Session — [Novemeber 24th, 2026] — driver: [Noah]

- **Goal for this session:** complete Marketplace design
- **Key prompts we gave Copilot** (paste the important ones):
  1. make the marketplace with similar ui as facebook marketplace, for any listings generate sample images and create an option to upload image with listing creation
  2. Dont allow  user profile to purchase its own listings, give a quantity amount for physical and when 0 qty left remove listing from market place
  3. make create listing button that opens up create listing menu in marketplace
  4. Create a button beside the create listing called "Purchases" which shows what purchases the account have purchased 
  5. Purchases tab should show to listing you purchased similar to the listings, make buton save size and color as creat listing 
  6. each listing in marketplace should be able to be clicked and opened similarly to an amazon listing
  7. for STL that have been purchased dont allow it to be purchased again 
  8. Generate numerous fictional listings with various seller accounts ratings, with a large distribution of quantities for physical copies
  9. Add purchasable battlemap into the marketplace, create 2 listings one with desert generated and one with arena themed battlemap. these must be able to be imported after purchase
- **What worked:** market place is now functional, battlemaps now in marketplace, populated marketplace.
- **What broke, and how we fixed it:** N/A
- **Committed?** yes / no — commit message: yes - Enhance marketplace functionality and UI: added battlemap listings, improved listing creation with image upload, and updated marketplace descriptions. Introduced new SVG battlemap assets for desert and arena themes.
---
### Session — [Novemeber 25th, 2026] — driver: [Noah]

- **Goal for this session:** finish marketplace and database
- **Key prompts we gave Copilot** (paste the important ones):
  1. Remove delete account purchase history button
  2. create a cart for marketplace listings and give a prompt saying "are you sure youd like to complete purchase"
  3.make cart open a menu on side of site and give a running price tally, and make all purchase buttons into add to cart buttons
  4. when purchase tab is open make button gold and change text to "close purchases" until its closed, closed button should read open purchases
  5.stop purchase and create listing tabs from opening at same time, only one should open at once
  6.remove generic database of creatures, only collected ones are needed for this page.
  7.to the right of that buton i want a button "Import from Marketplace" type button where i can import purchases, give it an option to upload new photo, notes, and painted status
  8.allow same purchase to be done multiple times, but add a counter of sdded to collection n number of times
- **What worked:** 
- **What broke, and how we fixed it:** N/A
- **Committed?** yes / no — commit message: yes - Enhance user interface and functionality for Marketplace and Collection features: renamed sections, improved layout, added cart functionality, and implemented confirmation dialogs. Updated styles for better responsiveness and visual appeal.
---
### Session — [Novemeber 25th, 2026] — driver: [Noah]

- **Goal for this session:** Improve UI and theme appearance
- **Key prompts we gave Copilot** (paste the important ones):
  1. make all buttons the navy/grey with a gold outline and gold text, when hovered or selected make them gold with outline and text black, make size the same as the blue buttons.
  2. create an enemy tag for collection and inititive tracker which gives red border for inititive tracker and make player markers red
  3.complete the process of buying mini, importing mini, importing into initive , and battle map and check for any issues
  4. If an item is qty 0 Just state sold out, not remove listing and do not allow its addition to cart.
- **What worked:** 
- **What broke, and how we fixed it:** N/A
- **Committed?** yes / no — commit message: yes - Refactor UI elements and improve functionality: rename "My Collection" to "The Vault", add enemy checkbox to combatant forms, enhance button styles, and ensure proper handling of sold-out items in the marketplace.

---
### Session — [Novemeber 25th, 2026] — driver: [Noah]

- **Goal for this session:** testing and phone accessability
- **Key prompts we gave Copilot** (paste the important ones):
  1. format so the app can run well on phone or ipad
  2. Test marketplace limits check for edge case failures
  3. check test cases for cart limits and purchase errors
  4. Test vault limits check for edge case failures
  5. Lock all vault collectiions,and market place listings above tier limit
  6. test for inititive edge cases and errors
  7. test for Battle map edge cases and errors
  8. test full app applications assuming you are on a cell phone
- **What worked:** 
- **What broke, and how we fixed it:** N/A
- **Committed?** yes / no — commit message: yes - Enhance combat and collection management: improve turn index validation, add collection quantity checks, implement listing lock functionality, and refine UI for locked entries in marketplace and collection views.
---
## Things that broke (running list)

| Date | What went wrong | What we tried | What finally fixed it |
|---|---|---|---|
|Novemeber 17th | Changes did not get commited  | reopening from git hub page/ checking forks  | Creating a new one from scratch|
| | | | |
| | | | |
| | | | |
## What a real version would need

Everything we wanted but faked or left out — real logins, a real database, payments, security, moderation, an app, staff, etc. For each one, say **why** it's needed and roughly **how hard or expensive** you think it would be.

| Feature we faked or skipped | Why a real company would need it | How hard / expensive? |
|---|---|---|
| | | |

## Reflection (fill in at the end)

1. What surprised you most about building software with AI?
2. Which parts were easy, and which were hard? Why do you think that is?
3. If a competitor had the same AI tool, how long would it take them to copy your site?
