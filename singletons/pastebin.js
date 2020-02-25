/* global sb */
module.exports = (function (Module) {
	"use strict";

	const allowedPrivacyOptions = ["public", "unlisted", "private"];
	const allowedExpirationOptions = {
		"never": "N",
		"10 minutes": "10M",
		"1 hour": "1H",
		"1 day": "1D",
		"1 week": "1W",
		"2 weeks": "2W",
		"1 month": "1M",
		"6 months": "6M",
		"1 year": "1Y"
	};

	/**
	 * Extra news module, for countries that are not included in the news command.
	 * Constructor must be await-ed.
	 * @name sb.Pastebin
	 * @type Pastebin()
	 */
	return class Pastebin extends Module {
		#authData = null;
		#authenticationPending = false;

		/**
		 * @inheritDoc
		 * @returns {Pastebin}
		 */
		static async singleton () {
			if (!Pastebin.module){
				Pastebin.module = new Pastebin();
			}
			return Pastebin.module;
		}

		/**
		 * Attempts to log in and preserves authentication data.
		 * @returns {Promise<void>}
		 */
		async login () {
			if (this.#authData || this.#authenticationPending) {
				return;
			}

			this.#authenticationPending = true;

			const { body, statusCode } = await sb.Got.instances.Pastebin({
				method: "POST",
				url: "api/api_login.php",
				timeout: 5000,
				body: new sb.URLParams()
					.set("api_dev_key", sb.Config.get("API_PASTEBIN"))
					.set("api_user_name", sb.Config.get("PASTEBIN_USER_NAME"))
					.set("api_user_password", sb.Config.get("PASTEBIN_PASSWORD"))
					.toString()
			});

			this.#authenticationPending = false;

			if (statusCode !== 200) {
				this.#authData = null;
			}
			else {
				this.#authData = body;
			}
		}

		/**
		 * Fetches a Pastebin paste, and returns the raw content.
		 * @param pasteID
		 * @returns {Promise<void>}
		 */
		async get (pasteID) {
			const { body, statusCode } = await sb.Got.instances.Pastebin("raw/" + pasteID);
			return (statusCode === 200)
				? body
				: null;
		}

		/**
		 * Posts given data to Pastebin. Returns a link to the created paste.
		 * @param {string} text
		 * @param {Object} options
		 * @param {string} [options.name]
		 * @param {number|string} [options.privacy]
		 * @param {string} [options.expiration]
		 * @param {string} [options.format]
		 * @returns {Promise<string>}
		 */
		async post (text, options = {}) {
			if (!this.#authData) {
				await this.login();
			}

			const params = new sb.URLParams()
				.set("api_dev_key", sb.Config.get("API_PASTEBIN"))
				.set("api_option", "paste")
				.set("api_paste_code", text)
				.set("api_paste_name", options.name || "untitled supibot paste")
				.set("api_paste_private", (options.privacy) ? Pastebin.getPrivacy(options.privacy) : "1")
				.set("api_paste_expire_date", (options.expiration) ? Pastebin.getExpiration(options.expiration) : "10M");

			if (this.#authData) {
				params.set("api_user_key", this.#authData);
			}

			if (options.format) {
				params.set("api_paste_format", options.format);
			}

			return await sb.Got.instances.Pastebin({
				method: "POST",
				url: "api_post.php",
				body: params.toString(),
				timeout: 5000
			}).text();
		}

		async delete (pasteID) {
			throw new sb.Error({
				message: "Not implemented yet."
			})
		}

		/**
		 * Parses out privacy options.
		 * @param {string|number} mode
		 * @returns {string}
		 */
		static getPrivacy (mode) {
			if (typeof mode === "number" && mode >= 0 && mode <= 2) {
				return String(mode);
			}
			else if (typeof mode === "string" && allowedPrivacyOptions.includes(mode)) {
				return String(allowedPrivacyOptions.indexOf(mode));
			}
			else {
				throw new sb.Error({
					message: "Pastebin: Invalid privacy option",
					args: arguments
				})
			}
		}

		static getExpiration (string) {
			if (Object.values(allowedExpirationOptions).includes(string)) {
				return string;
			}
			else if (allowedExpirationOptions[string]) {
				return allowedExpirationOptions[string];
			}
			else {
				throw new sb.Error({
					message: "Pastebin: Invalid expiration option",
					args: arguments
				});
			}
		}

		get modulePath () { return "pastebin"; }

		/** @inheritDoc */
		destroy () {}
	};
});