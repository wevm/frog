---
"frog": minor
---

Split icons into different packages and reduces the bundle size by importing just one collection instead of all.
Introduces a breaking change as afterwards icons must be imported as packages, rather than literal string.
Specifically, the next subpackages were created:

- `frog/ui/icons/heroicons`
- `frog/ui/icons/lucide`
- `frog/ui/icons/radix-icons`
