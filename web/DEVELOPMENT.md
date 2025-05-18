# Development Guide

## Local Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local` and fill in the required values.

4. Start the development server:
   ```bash
   npm run dev
   ```

## Development Tools

- **ESLint**: Linting for code quality.
- **Prettier**: Code formatting.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Component library.

## Git Workflow

- Use feature branches for new features or bug fixes.
- Submit pull requests for review before merging into the main branch.

## Testing

- Run tests with `npm test`.
- Ensure all tests pass before submitting a pull request.

## Deployment

- The project is deployed using GitHub Actions.
- Ensure CI/CD pipeline passes before merging into the main branch. 