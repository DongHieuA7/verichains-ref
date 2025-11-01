// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	app: {
		head: {
			title: 'Nuxt Supabase Starter - Supercharged Your Project',
			htmlAttrs: {
				lang: 'en',
			},
			meta: [
				{
					hid: 'description',
					name: 'description',
					content:
						'Nuxt and Supabase Starer to help you kickstart your next project.',
				},
				{ hid: 'og:image', name: 'og:image', content: '/og-image.png' },
			],
			link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.png' }],
		},
	},
	devtools: { enabled: true },
	// extends: '@nuxt-themes/docus',
	ui: {
		icons: ['lucide'],
	},
	supabase: {
		redirect: false,
	},
	runtimeConfig: {
		public: {
			APP_URL: process.env.APP_URL || process.env.NUXT_PUBLIC_APP_URL,
			supabaseUrl: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL,
			supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY,
		},
		supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
		supabaseUrl: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL,
	},
	modules: [
		'@nuxt/ui',
		'nuxt-icon',
		'@nuxtjs/color-mode',
		'@vueuse/nuxt',
		'@nuxtjs/supabase',
		'@nuxt/content',
		'@nuxtjs/i18n',
	],
	i18n: {
		locales: [
			{
				code: 'en',
				iso: 'en-US',
				name: 'English',
				file: 'en.json',
			},
			{
				code: 'vi',
				iso: 'vi-VN',
				name: 'Tiếng Việt',
				file: 'vi.json',
			},
		],
		lazy: true,
		langDir: 'locales',
		defaultLocale: 'en',
		strategy: 'no_prefix',
		detectBrowserLanguage: {
			useCookie: true,
			cookieKey: 'i18n_redirected',
			redirectOn: 'root',
		},
	},
	content: {
		contentHead: true,
	},
})
