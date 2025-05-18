# Branching Strategy

## Main Branches

- **main**: The production-ready branch. All code merged here should be stable and tested.
- **develop**: The integration branch for features. All feature branches should be merged here.

## Feature Branches

- Branch off from: `develop`
- Merge back into: `develop`
- Naming convention: `feature/<feature-name>`

## Bug Fix Branches

- Branch off from: `develop`
- Merge back into: `develop`
- Naming convention: `bugfix/<bug-description>`

## Release Branches

- Branch off from: `develop`
- Merge back into: `main` and `develop`
- Naming convention: `release/<version>`

## Hotfix Branches

- Branch off from: `main`
- Merge back into: `main` and `develop`
- Naming convention: `hotfix/<issue-description>`

## Pull Requests

- All changes must be submitted as pull requests.
- Pull requests must be reviewed and approved before merging. 