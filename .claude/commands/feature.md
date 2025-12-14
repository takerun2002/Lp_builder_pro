# Feature Command
Description: Create a new feature with boilerplate files.

## Usage
/feature [feature-name]

## Arguments
- feature-name: The name of the feature in kebab-case (e.g., "magic-pen")

## Steps
1. Create directory: `src/components/features/{{feature-name}}/`
2. Create component file: `{{FeatureName}}.tsx`
3. Create hook file (if needed): `use{{FeatureName}}.ts`
4. Create types file: `types.ts`
5. Create index.ts for exports.
6. Update CLAUDE.md if this is a major feature.



