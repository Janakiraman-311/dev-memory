# Contributing to Dev Memory

Thank you for your interest in contributing to Dev Memory! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Expected Behavior

- Be respectful and considerate
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other contributors

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling or insulting/derogatory comments
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

1. **Bug Reports**: Help us identify and fix issues
2. **Feature Requests**: Suggest new features or improvements
3. **Code Contributions**: Submit bug fixes or new features
4. **Documentation**: Improve README, guides, or code comments
5. **Testing**: Test the extension on different platforms and browsers
6. **Design**: Suggest UI/UX improvements

## Development Setup

### Prerequisites

- **Browser**: Microsoft Edge or Google Chrome
- **Code Editor**: VS Code (recommended) or any text editor
- **Git**: For version control

### Setup Steps

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/dev-memory.git
   cd dev-memory
   ```

2. **Load Extension in Browser**
   - Open Edge: `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dev-memory-extension` folder

3. **Make Changes**
   - Edit files in your preferred editor
   - Reload extension to test changes

4. **Test Thoroughly**
   - Test on all supported platforms (ChatGPT, Claude, Gemini, Perplexity)
   - Check console for errors
   - Verify UI changes in popup and sidepanel

## Coding Standards

### JavaScript

- **ES6+**: Use modern JavaScript features
- **Async/Await**: Prefer async/await over promises
- **Error Handling**: Always use try-catch for async operations
- **Comments**: Add comments for complex logic
- **Naming**: Use camelCase for variables and functions

Example:
```javascript
// Good
async function captureMessage(messageElement) {
    try {
        const content = extractContent(messageElement);
        await saveMessage(content);
    } catch (error) {
        console.error('[DevMem] Capture failed:', error);
    }
}

// Avoid
function capture_message(msg) {
    // No error handling, unclear naming
    saveMessage(msg);
}
```

### CSS

- **Class Naming**: Use kebab-case for class names
- **Organization**: Group related styles together
- **Comments**: Add section comments
- **Responsive**: Consider mobile/small screens

Example:
```css
/* Message Container */
.message-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.message-item {
    padding: 16px;
    border-radius: 8px;
}
```

### HTML

- **Semantic HTML**: Use appropriate HTML5 elements
- **Accessibility**: Include ARIA labels where needed
- **IDs**: Use unique, descriptive IDs

## Submitting Changes

### Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make Your Changes**
   - Follow coding standards
   - Test thoroughly
   - Update documentation if needed

3. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: Add feature description"
   # or
   git commit -m "fix: Fix bug description"
   ```

   **Commit Message Format:**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting, etc.)
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Maintenance tasks

4. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Go to GitHub and create a PR from your fork
   - Provide clear description of changes
   - Reference any related issues

### Pull Request Guidelines

- **One Feature Per PR**: Keep PRs focused on a single feature or fix
- **Clear Description**: Explain what changes you made and why
- **Screenshots**: Include screenshots for UI changes
- **Testing**: Describe how you tested the changes
- **Documentation**: Update README or docs if needed

## Reporting Bugs

### Before Reporting

1. **Check Existing Issues**: Search [GitHub Issues](https://github.com/Janakiraman-311/dev-memory/issues) to avoid duplicates
2. **Test in Clean Environment**: Disable other extensions to isolate the issue
3. **Gather Information**: Note browser version, OS, and steps to reproduce

### Bug Report Template

```markdown
**Bug Description**
A clear description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment**
- Browser: [e.g., Edge 120.0]
- OS: [e.g., Windows 11]
- Extension Version: [e.g., 1.0.0]

**Additional Context**
Any other relevant information.
```

## Suggesting Features

### Feature Request Template

```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Use Case**
Explain why this feature would be useful.

**Proposed Solution**
How you envision this feature working.

**Alternatives Considered**
Other approaches you've thought about.

**Additional Context**
Any other relevant information, mockups, or examples.
```

### Feature Evaluation Criteria

We evaluate features based on:
- **User Value**: Does it solve a real problem?
- **Scope**: Does it fit the project's goals?
- **Complexity**: Is it feasible to implement?
- **Privacy**: Does it maintain our privacy-first approach?

## Development Guidelines

### Testing Checklist

Before submitting a PR, verify:

- [ ] Extension loads without errors
- [ ] Captures work on all 4 platforms (ChatGPT, Claude, Gemini, Perplexity)
- [ ] Popup UI displays correctly
- [ ] Sidepanel UI displays correctly
- [ ] Search and filtering work
- [ ] Export functionality works
- [ ] No console errors
- [ ] Code follows style guidelines
- [ ] Documentation updated if needed

### Platform-Specific Testing

Test capture on each platform:
- **ChatGPT**: chatgpt.com and chat.openai.com
- **Claude**: claude.ai
- **Gemini**: gemini.google.com
- **Perplexity**: perplexity.ai

### Debug Mode

Enable debug mode in `content.js`:
```javascript
const DEBUG = true; // Set to true for detailed logs
```

Look for `[DevMem]` logs in the browser console.

## Questions?

If you have questions about contributing:
- **Email**: [devmemory.extension@gmail.com](mailto:devmemory.extension@gmail.com)
- **GitHub Issues**: [Ask a question](https://github.com/Janakiraman-311/dev-memory/issues/new)

## License

By contributing to Dev Memory, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Dev Memory! 🎉
