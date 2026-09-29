# The "Save to mymind" iPhone Shortcut

This adds **Save to mymind** to your iPhone Share menu. From TikTok, Instagram, Pinterest, Safari
or Photos, tap **Share → Save to mymind**. You can add a note and a screenshot, and the item lands in
your library, where the AI reads and tags it.

You need two things from your deployed app (both are shown on the app's **/setup** page):

- **Save address**: `https://YOUR-SITE.netlify.app/api/save`
- **Save token**: the `SAVE_TOKEN` value you set in Netlify

## Build it (about 10 minutes, once)

Open the **Shortcuts** app → **+** (new shortcut) → rename it **Save to mymind**.

### 1. Let it appear in the Share menu
Tap the **ⓘ** (details) button at the bottom → turn on **Show in Share Sheet**.
Back in the editor, tap the first line that says *"Receive **Any** input from **Share Sheet**"*, and
keep **URLs**, **Safari web pages**, **Images** and **Text** ticked. Set *"If there's no input"* to **Continue**.

### 2. Grab the link (if there is one)
- Add **Get URLs from Input** → input: *Shortcut Input*.
- Add **Set Variable** → name it `Link`.

### 3. Grab the image (if you shared a photo or screenshot)
- Add **Get Images from Input** → input: *Shortcut Input*.
- Add **Set Variable** → name it `Image`.

### 4. Optional note
- Add **Ask for Input** → type *Text*, prompt: `Add a note? (optional)`.
- Add **Set Variable** → name it `Note`.

### 5. Optional screenshot (for when the app can't read the link)
- Add **If** → `Image` **does not have any value**.
  - Inside the If, add **Choose from Menu** → prompt `Add a screenshot?` with three options:
    - **No**: leave empty.
    - **Latest screenshot**: add **Get Latest Screenshots** (count 1), then **Set Variable** `Image`.
    - **Pick from Photos**: add **Select Photos**, then **Set Variable** `Image`.
- **End If**

> Tip: the quickest flow is to take a screenshot in TikTok/Instagram first, then Share → Save to
> mymind → **Latest screenshot**.

### 6. Shrink the image (keeps uploads fast)
- Add **If** → `Image` **has any value**.
  - **Convert Image** → `Image` to **JPEG**.
  - **Resize Image** → the converted image, width **1600** (leave height as *Auto Height*).
  - **Set Variable** `Image` (to the resized image).
- **End If**

### 7. Send it
Add **Get Contents of URL**:
- URL: your save address, e.g. `https://YOUR-SITE.netlify.app/api/save`
- Tap **Show More**:
  - Method: **POST**
  - Headers: add one, Key `Authorization`, Value `Bearer YOUR_SAVE_TOKEN`
    (the word `Bearer`, a space, then your token)
  - Request Body: **Form**, and add three fields:
    - `url`: *Text* → variable `Link`
    - `note`: *Text* → variable `Note`
    - `image`: *File* → variable `Image`

### 8. Confirm
Add **Show Notification** → `Saved to mymind ✓`.

## Try it
Open a TikTok → **Share** → scroll the bottom row to **More** (or **Share to…**) → **Save to mymind**.
The item shows up in your library straight away with "Reading…" on it. A few seconds later it has a
thumbnail, a title, a category and tags.

On Instagram and Pinterest, use **Share → Share to…** (or **More**) to reach the iPhone share menu.
You can also share straight from **Photos** to save an image.

## If something goes wrong
- **"Not signed in"**: the token in the header doesn't match `SAVE_TOKEN`. Check for the space after `Bearer`.
- **Item says "Couldn't read this link"**: some Instagram posts need a login to see. Open the item and
  add a screenshot or a note, then tap **Re-run AI**. Or save it again and pick **Latest screenshot**.
- **Saving a big photo fails**: make sure step 6 (Convert + Resize) is there.
