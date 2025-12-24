# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - main [ref=e12]:
    - generic [ref=e15]:
      - generic [ref=e16]:
        - img [ref=e18]
        - heading "Welcome Back" [level=2] [ref=e21]
        - paragraph [ref=e22]: Sign in to access your dashboard
      - generic [ref=e23]:
        - generic [ref=e24]: Email Address
        - generic [ref=e25]:
          - generic:
            - img
          - textbox "you@clinic.com" [ref=e26]
      - generic [ref=e27]:
        - generic [ref=e28]: Password
        - generic [ref=e29]:
          - generic:
            - img
          - textbox "••••••••" [ref=e30]
      - button "Sign In" [ref=e31]:
        - text: Sign In
        - img [ref=e32]
      - paragraph [ref=e35]:
        - text: Don't have an account?
        - link "Sign up for free" [ref=e36] [cursor=pointer]:
          - /url: /signup
```