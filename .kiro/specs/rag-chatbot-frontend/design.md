# Frontend Design: RAG Chatbot Interface

## Design System Overview

### Visual Language
- **Primary Colors**: Neutral-based design system with OKLCH color space
- **Typography**: Geist Sans (primary) and Geist Mono (code)
- **Spacing**: Consistent 0.25rem (4px) grid system
- **Border Radius**: 0.625rem (10px) base with variants
- **Shadows**: Subtle shadows for depth and hierarchy

### Component Library
- **shadcn/ui**: New York style with full customization
- **Tailwind CSS v4**: Utility-first with custom design tokens
- **Lucide Icons**: Consistent iconography throughout
- **Animations**: Smooth transitions with tw-animate-css

## Application Architecture

### Page Structure
```
├── / (Dashboard)
│   ├── Project Grid/List
│   ├── Create Project Modal
│   └── Navigation Header
│
├── /projects/[id]
│   ├── Project Header
│   ├── Document Management
│   └── Chat Interface
│
└── /projects/[id]/chat
    └── Full-screen Chat Experience
```

### Component Hierarchy
```
App
├── Layout
│   ├── Header/Navigation
│   ├── Main Content
│   └── Footer
│
├── Pages
│   ├── DashboardPage
│   │   ├── ProjectGrid
│   │   ├── ProjectCard
│   │   └── CreateProjectModal
│   │
│   ├── ProjectPage
│   │   ├── ProjectHeader
│   │   ├── DocumentSection
│   │   │   ├── UploadArea
│   │   │   ├── DocumentList
│   │   │   └── ProcessingStatus
│   │   └── ChatSection
│   │       ├── MessageList
│   │       ├── MessageInput
│   │       └── TypingIndicator
│   │
│   └── ChatPage
│       └── FullChatInterface
```

## Key User Flows

### 1. Project Creation Flow
```
User clicks "Create Project"
    ↓
Modal opens with form
    ↓
User enters project name
    ↓
Form validates input
    ↓
API call to create project
    ↓
Success toast + modal closes
    ↓
Project appears in grid
```

### 2. Document Upload Flow
```
User selects project
    ↓
Clicks upload area
    ↓
File picker opens
    ↓
User selects file(s)
    ↓
Progress bar appears
    ↓
Upload completes
    ↓
Processing status shows
    ↓
Document appears in list
```

### 3. Chat Interaction Flow
```
User selects project
    ↓
Types message in chat input
    ↓
Message appears in chat
    ↓
Typing indicator shows
    ↓
Response appears with source count
    ↓
Chat history preserved
```

## Component Specifications

### ProjectCard Component
```tsx
interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    createdAt: Date;
    documentCount: number;
  };
  onClick: () => void;
  onDelete: () => void;
}

Features:
- Hover effects with subtle shadow
- Document count badge
- Delete confirmation dialog
- Responsive grid layout
```

### UploadArea Component
```tsx
interface UploadAreaProps {
  projectId: string;
  onUploadComplete: (document: Document) => void;
  onUploadError: (error: string) => void;
}

Features:
- Drag & drop zone
- File type validation
- Size limit indicators
- Progress visualization
- Error state handling
```

### ChatInterface Component
```tsx
interface ChatInterfaceProps {
  projectId: string;
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping: boolean;
}

Features:
- Message bubbles with alignment
- Source attribution badges
- Typing indicator animation
- Auto-scroll to latest message
- Message timestamps
```

### MessageInput Component
```tsx
interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

Features:
- Auto-resize textarea
- Send button with loading state
- Keyboard shortcuts (Enter to send)
- Character limit validation
```

## Responsive Design Patterns

### Mobile-First Approach
- **Breakpoint Strategy**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch Targets**: Minimum 44px for all interactive elements
- **Thumb-Friendly**: Important actions positioned for thumb access

### Adaptive Layouts
```css
/* Mobile: Single column */
.project-grid {
  @apply grid-cols-1 gap-4;
}

/* Tablet: Two columns */
@media (min-width: 768px) {
  .project-grid {
    @apply grid-cols-2 gap-6;
  }
}

/* Desktop: Three columns */
@media (min-width: 1024px) {
  .project-grid {
    @apply grid-cols-3 gap-8;
  }
}
```

## State Management Strategy

### TanStack Query Integration
```tsx
// Project queries
const { data: projects, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects,
});

// Document mutations
const uploadMutation = useMutation({
  mutationFn: uploadDocument,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  },
});
```

### Local Component State
- Form states managed with React Hook Form
- UI states (modals, dropdowns) with useState
- Optimistic updates for immediate feedback

## Animation & Interaction Design

### Micro-Interactions
- **Button Hover**: Subtle scale and shadow changes
- **Loading States**: Skeleton loaders and spinners
- **Success Feedback**: Toast notifications with checkmarks
- **Error States**: Shake animations for form validation

### Page Transitions
- **Route Changes**: Smooth fade transitions
- **Modal Open/Close**: Scale and fade animations
- **Content Loading**: Staggered content appearance

## Accessibility Design

### Keyboard Navigation
- **Tab Order**: Logical focus flow through all interactive elements
- **Focus Indicators**: Visible focus rings meeting contrast requirements
- **Keyboard Shortcuts**: Standard shortcuts (Enter, Escape, etc.)

### Screen Reader Support
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Live Regions**: Dynamic content announced to screen readers
- **Semantic HTML**: Proper heading hierarchy and landmarks

### Color & Contrast
- **Text Contrast**: Minimum 4.5:1 ratio for normal text
- **Focus Indicators**: 3:1 contrast ratio minimum
- **Color Independence**: No color-only information conveyance

## Error Handling UX

### Error States
```tsx
// Network error
<ErrorState
  title="Connection Failed"
  message="Unable to connect to the server. Please check your internet connection."
  action={<Button onClick={retry}>Try Again</Button>}
/>

// Validation error
<FormField error="Project name is required" />

// API error
<Toast variant="destructive">
  Failed to create project. Please try again.
</Toast>
```

### Loading States
```tsx
// Skeleton loading
<ProjectCardSkeleton />

// Inline loading
<Button loading={isSubmitting}>
  Create Project
</Button>

// Progress indicators
<UploadProgress value={progress} />
```

## Performance Optimizations

### Code Splitting
- **Route-based splitting**: Automatic with Next.js App Router
- **Component lazy loading**: Heavy components loaded on demand
- **Library chunking**: Vendor libraries in separate chunks

### Image Optimization
- **Next.js Image**: Automatic optimization and responsive images
- **Format selection**: WebP/AVIF with fallbacks
- **Lazy loading**: Images load as they enter viewport

### Bundle Optimization
- **Tree shaking**: Unused code automatically removed
- **Dynamic imports**: Heavy features loaded on interaction
- **Caching strategy**: Aggressive caching for static assets

## Dark Mode Implementation

### Theme System
```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... light theme variables */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... dark theme variables */
}
```

### Theme Toggle
- **System preference detection**: Respects user's OS setting
- **Manual override**: User can toggle theme
- **Persistent preference**: Theme choice saved in localStorage

## Testing Strategy

### Component Testing
```tsx
describe('ProjectCard', () => {
  it('displays project information', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    const mockOnDelete = jest.fn();
    render(<ProjectCard project={mockProject} onDelete={mockOnDelete} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockOnDelete).toHaveBeenCalled();
  });
});
```

### Integration Testing
- **API mocking**: MSW for consistent API responses
- **User journey testing**: Critical flows tested end-to-end
- **Error scenario testing**: Network failures and edge cases

### Visual Testing
- **Screenshot comparison**: Visual regression testing
- **Responsive testing**: Different viewport sizes
- **Accessibility testing**: Automated a11y checks

## Deployment Architecture

### Build Optimization
- **Static generation**: Marketing content pre-built
- **Server-side rendering**: Dynamic content for SEO
- **Edge runtime**: Global CDN deployment with Vercel

### Environment Strategy
```bash
# Development
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Production
NEXT_PUBLIC_API_URL=https://api.example.com
```

### Monitoring & Analytics
- **Performance monitoring**: Core Web Vitals tracking
- **Error tracking**: Sentry for error reporting
- **User analytics**: Privacy-focused event tracking
- **Conversion tracking**: Key user actions monitored