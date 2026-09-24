# SolDirectory CMS (headless WordPress)

This WordPress install exists to serve content to `apps/web` via the
REST API. It has no public-facing theme — nobody should ever browse
this site directly; `apps/web` is the real frontend.

## What's real here vs. what you need to install

**Written and included in this repo:**
- `composer.json` — declares WordPress core as a dependency
- `wp-config.php` — real, env-based config (no hardcoded credentials)
- `wp-content/plugins/soldirectory-content/` — the actual custom code: registers a `service_area_page` content type matching `apps/web/src/data/servicePageFixtures.ts`'s illustrative content, exposes it via REST, and adds the CORS headers the React app needs to fetch it
- `wp-content/themes/headless/` — the minimal theme WP requires internally (never rendered to a visitor)

**NOT included, and installed by you, per the setup steps below:**
- WordPress core itself (`wordpress/` — thousands of files, pulled in by Composer, never hand-written or committed)
- The actual MySQL database
- PHP itself, and a webserver (Apache/Nginx/PHP's built-in server) to run it

I want to be direct about why: I don't have PHP or MySQL available in
the environment I'm working in, so I can't install, run, or verify
this the way everything else in this project has been type-checked
and build-tested. The custom plugin code is written carefully and
correctly to the best of my review, but it hasn't been executed.
Treat first-run testing as more important than usual here.

## Setup

1. **Install PHP and MySQL** if you don't have them (e.g. via
   Laravel Herd, XAMPP, or your own local PHP/MySQL install — any
   PHP 8+ / MySQL 5.7+ setup works).

2. From `apps/cms`, install WordPress core and dependencies:
   ```
   composer install
   ```
   This downloads WordPress core into `apps/cms/wordpress/` — it is
   never committed to git (see `.gitignore`).

3. Create a MySQL database matching what you'll put in `.env`:
   ```sql
   CREATE DATABASE soldirectory_cms;
   ```

4. Copy `.env.example` to `.env` and fill in:
   - Your real `DB_USER`/`DB_PASSWORD`/`DB_HOST`
   - `WP_SITE_URL` (e.g. `http://localhost:8080`)
   - `FRONTEND_ORIGIN` — must exactly match where `apps/web` runs
     (e.g. `http://localhost:5173` in dev), or the CORS headers in
     the custom plugin won't allow the browser to fetch from this API
   - All 8 `WP_*_KEY`/`WP_*_SALT` values — generate real random ones
     at https://api.wordpress.org/secret-key/1.1/salt/. The
     placeholders in `.env.example` are not secure.

5. Point a PHP server at `apps/cms` as the document root. For local
   dev, PHP's built-in server works fine:
   ```
   php -S localhost:8080
   ```

6. Visit `http://localhost:8080/wp-admin/install.php` and complete
   WordPress's normal first-run setup (site title, admin username/
   password). This is standard WordPress installation — nothing
   specific to this project.

7. In wp-admin, go to **Plugins** and activate **SolDirectory
   Content**. Go to **Appearance > Themes** and activate
   **SolDirectory Headless**.

8. Create a post under the new **Service Area Pages** menu item.
   Its custom fields (service name, suburb, FAQ, etc.) are stored as
   post meta — until a proper edit-screen UI is built for them
   (not done here), you'll need a plugin like "Advanced Custom
   Fields" for a friendly editing experience, or edit the meta
   directly via the block editor's Custom Fields panel (enable it
   under Preferences if hidden), or via `wp-cli`.

9. Test the REST endpoint directly:
   ```
   curl http://localhost:8080/wp-json/wp/v2/service-area-pages
   ```
   You should see your post, with its custom fields under `meta`.

10. In `apps/web`, set `VITE_WORDPRESS_URL=http://localhost:8080` in
    `.env`. `src/api/wordpressApi.ts` is ready to fetch from it —
    it is NOT yet wired into `ServiceLocationPage.tsx` itself (that
    page still reads from the hardcoded illustrative arrays). Wiring
    it in is the next real step once you've confirmed step 9 above
    returns real data.

## Adding more content types later

Follow the exact same pattern in
`wp-content/plugins/soldirectory-content/includes/post-types.php` —
duplicate the `register_post_type()` + `register_post_meta()` calls
with a new slug (e.g. `provider_profile` for content-managed
provider marketing pages). The CORS and read-only enforcement in
`rest-api.php` already applies to every post type automatically —
nothing to change there.

## Content saved while ACF was active

The custom meta boxes replaced ACF/SCF, but content created under ACF is stored
differently (repeaters as a row COUNT plus `columns_0_title`-style keys, groups
as `cost_group_title`-style keys, relationships as serialized ID arrays, images
as attachment IDs). `includes/acf-compat.php` reads that format and converts each
post once into this plugin's JSON storage: the first time the post is read
through REST / the mega-menu endpoint / the editor, and for every post on the
first wp-admin page load after deploy. The old ACF meta is left untouched.

After deploying, check the API is healthy (should be JSON, never a PHP error):

    curl -s "http://<wordpress-host>/wp-json/wp/v2/services?per_page=1&_fields=slug,meta"
    curl -s "http://<wordpress-host>/wp-json/soldirectory/v1/mega-menu"

## Testing the plugin without WordPress

`tests/plugin-harness.php` loads the real plugin files against a small fake
WordPress (in-memory post meta) and, for every post type, writes sample content
in ACF's flattened format, then checks the migration, the REST injection (including
a response with no `meta` key - the case that once fatalled every services
endpoint) and the mega-menu endpoint. Needs only the PHP CLI:

    php apps/cms/tests/plugin-harness.php apps/cms/wp-content/plugins/soldirectory-content
