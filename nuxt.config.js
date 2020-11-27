import { promises as fs } from 'fs'
import path from 'path'

import pkg from './package'
import buildAppList from './helpers/build-app-list.js'
import buildGamesList from './helpers/build-game-list.js'


const listsOptions = [
    {
        buildMethod: buildAppList,
        path: '/static/app-list.json',
        route: app => '/app/' + app.slug
    },
    {
        buildMethod: buildGamesList,
        path: '/static/game-list.json',
        route: app => '/game/' + app.slug
    }
]


const storeAppLists = async function (builder) {

    console.log('Build Lists started')

    const savedLists = await Promise.all(listsOptions.map(async list => {

        // Run the build method
        const builtList = await list.buildMethod()

        // Make the relative path for our new JSON file
        const listFullPath = `.${list.path}`

        // console.log('listFullPath', listFullPath)

        // Write the list to JSON
        await fs.writeFile(listFullPath, JSON.stringify(builtList))

        // Read back the JSON we just wrote to ensure it exists
        const savedListJSON = await fs.readFile(listFullPath, 'utf-8')

        // console.log('savedListJSON', savedListJSON)

        const savedList = JSON.parse(savedListJSON)

        // Import the created JSON File
        return savedList
    }))

    console.log('Build Lists finished')

    return savedLists
}


export default {
    target: 'static',

    /*
    ** Hooks
    * https://nuxtjs.org/api/configuration-hooks/
    */
    hooks: {
        build: {
            before: storeAppLists
        },
        generate: {
            before: storeAppLists
        }
    },

    generate: {
        cache: {
            ignore: [
                // When something changed in the docs folder, do not re-build via webpack
                'assets'
            ]
        },
        routes() {
            return Promise.all(listsOptions.map(async list => {
                const listPath = `.${list.path}`

                // Read JSON to ensure it exists
                const savedListJSON = await fs.readFile(listPath, 'utf-8')

                // Parse the saved JSON into a variable
                const savedList = JSON.parse(savedListJSON)

                // Pass on the variable
                return savedList
            }))
                .then(( lists ) => {
                    // console.log('appList', appList)

                    // const appRoutes = appList.map(app => ({
                    //     route: '/app/' + app.slug,
                    //     // payload: appList
                    // }))

                    // const gameRoutes = gameList.map(game => ({
                    //     route: '/game/' + game.slug,
                    //     // payload: appList
                    // }))

                    const sectionList = []

                    const [
                        appRoutes,
                        gameRoutes
                    ] = lists.map((list, listI) => {
                        return list.map( app => {
                            // Find and store all sections
                            if (sectionList.includes(app.section.slug) == false) {
                                sectionList.push(app.section.slug)
                            }

                            return app.endpoint
                        })
                    })

                    const sectionRoutes = sectionList.map(slug => ({
                        route: '/kind/' + slug,
                        // payload: appList
                    }))

                    return [
                        ...appRoutes,
                        ...gameRoutes,
                        ...sectionRoutes
                    ]
                })
        }
    },

    /*
    ** Headers of the page
    */
    head: {
        // this htmlAttrs you need
        htmlAttrs: {
            lang: 'en',
        },
        title: 'Does it ARM',
        meta: [
            { charset: 'utf-8' },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1'
            },
            {
                hid: 'description',
                name: 'description',
                content: pkg.description
            }
        ],
        link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]
    },

    /*
    ** Customize the progress-bar color
    */
    loading: { color: '#fff' },

    /*
    ** Global CSS
    */
    // css: ['~/assets/css/tailwind.css'],

    /*
    ** Plugins to load before mounting the App
    */
    plugins: [],

    /*
    ** Nuxt.js modules
    */

    modules: [
        '@nuxtjs/sitemap'
    ],

    sitemap: {
        hostname: 'https://doesitarm.com'
    },

    buildModules: [
        '@nuxtjs/tailwindcss'
    ],

    /*
    ** Build configuration
    */
    build: {
        /*
        ** You can extend webpack config here
        */
        extend(config, ctx) {
            // Run ESLint on save
            if (ctx.isDev && ctx.isClient) {
                config.module.rules.push({
                    enforce: 'pre',
                    test: /\.(js|vue)$/,
                    loader: 'eslint-loader',
                    exclude: /(node_modules)/
                })

                config.node = {
                    fs: "empty"
                }

            }
        }
    }
}
