import nx from "@nx/eslint-plugin";

export default [
    ...nx.configs["flat/base"],
    ...nx.configs["flat/typescript"],
    ...nx.configs["flat/javascript"],
    {
        ignores: [
            "**/dist",
            "**/out-tsc"
        ]
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.js",
            "**/*.jsx"
        ],
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    enforceBuildableLibDependency: true,
                    allow: [
                        "^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"
                    ],
                    depConstraints: [
                        {
                            sourceTag: "type:domain",
                            onlyDependOnLibsWithTags: ["type:domain", "type:shared"]
                        },
                        {
                            sourceTag: "type:contracts",
                            onlyDependOnLibsWithTags: ["type:shared"]
                        },
                        {
                            sourceTag: "type:application",
                            onlyDependOnLibsWithTags: ["type:domain", "type:contracts", "type:shared"]
                        },
                        {
                            sourceTag: "type:infra",
                            onlyDependOnLibsWithTags: ["type:application", "type:domain", "type:contracts", "type:config", "type:shared"]
                        },
                        {
                            sourceTag: "type:ui",
                            onlyDependOnLibsWithTags: ["type:contracts", "type:shared"]
                        },
                        {
                            sourceTag: "type:config",
                            onlyDependOnLibsWithTags: ["type:shared"]
                        },
                        {
                            sourceTag: "type:shared",
                            onlyDependOnLibsWithTags: ["type:shared"]
                        },
                        {
                            sourceTag: "type:testing",
                            onlyDependOnLibsWithTags: ["type:domain", "type:application", "type:contracts", "type:config", "type:shared"]
                        },
                        {
                            sourceTag: "type:app",
                            onlyDependOnLibsWithTags: ["*"]
                        }
                    ]
                }
            ]
        }
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.cts",
            "**/*.mts",
            "**/*.js",
            "**/*.jsx",
            "**/*.cjs",
            "**/*.mjs"
        ],
        // Override or add rules here
        rules: {}
    }
];
