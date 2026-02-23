
export function createMockAuthStore() {
  return {
    isOwner: jest.fn().mockReturnValue(false),
    isAuthenticated: jest.fn().mockReturnValue(true),
    user: jest.fn().mockReturnValue(null),
    userRoles: jest.fn().mockReturnValue([]),
    accessToken: jest.fn().mockReturnValue('token'),
    isLoading: jest.fn().mockReturnValue(false),
    error: jest.fn().mockReturnValue(null),
    currentUserName: jest.fn().mockReturnValue(null),
    displayRole: jest.fn().mockReturnValue(null),
    setAuthResponse: jest.fn(),
    setTokens: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    clearAuth: jest.fn(),
    getRoleForDepartment: jest.fn().mockReturnValue(null),
    isAdminInDepartment: jest.fn().mockReturnValue(false),
    isViewerInDepartment: jest.fn().mockReturnValue(false),
    hasAccessToDepartment: jest.fn().mockReturnValue(false),
  };
}

export function createMockTaskStore() {
  return {
    tasks: jest.fn().mockReturnValue([]),
    filteredTasks: jest.fn().mockReturnValue([]),
    tasksByStatus: jest.fn().mockReturnValue({ TODO: [], IN_PROGRESS: [], DONE: [] }),
    filters: jest.fn().mockReturnValue({
      search: '',
      status: null,
      category: null,
      priority: null,
      sortBy: 'position',
      sortDirection: 'asc',
    }),
    selectedTask: jest.fn().mockReturnValue(null),
    selectedTaskId: jest.fn().mockReturnValue(null),
    isLoading: jest.fn().mockReturnValue(false),
    error: jest.fn().mockReturnValue(null),
    taskCount: jest.fn().mockReturnValue(0),
    hasActiveFilters: jest.fn().mockReturnValue(false),
    setTasks: jest.fn(),
    addTask: jest.fn(),
    updateTask: jest.fn(),
    removeTask: jest.fn(),
    reorderTasks: jest.fn(),
    setSelectedTask: jest.fn(),
    setFilters: jest.fn(),
    resetFilters: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    reset: jest.fn(),
  };
}

export function createMockDepartmentStore() {
  return {
    departments: jest.fn().mockReturnValue([]),
    currentDepartmentId: jest.fn().mockReturnValue(null),
    currentDepartment: jest.fn().mockReturnValue(null),
    members: jest.fn().mockReturnValue([]),
    orgUsers: jest.fn().mockReturnValue([]),
    allKnownUsers: jest.fn().mockReturnValue(new Map()),
    isLoading: jest.fn().mockReturnValue(false),
    error: jest.fn().mockReturnValue(null),
    setDepartments: jest.fn(),
    setCurrentDepartment: jest.fn(),
    addDepartment: jest.fn(),
    updateDepartment: jest.fn(),
    removeDepartment: jest.fn(),
    setMembers: jest.fn(),
    setOrgUsers: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateMember: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    reset: jest.fn(),
  };
}

export function createMockUIStore() {
  return {
    theme: jest.fn().mockReturnValue('light'),
    taskView: jest.fn().mockReturnValue('list'),
    isSidebarOpen: jest.fn().mockReturnValue(true),
    isDarkMode: jest.fn().mockReturnValue(false),
    toggleTheme: jest.fn(),
    setTheme: jest.fn(),
    setTaskView: jest.fn(),
    toggleSidebar: jest.fn(),
    closeSidebar: jest.fn(),
    openSidebar: jest.fn(),
  };
}

export function createMockToastService() {
  return {
    toasts: jest.fn().mockReturnValue([]),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    dismiss: jest.fn(),
  };
}

export function createMockOrganizationStore() {
  return {
    organization: jest.fn().mockReturnValue(null),
    isLoading: jest.fn().mockReturnValue(false),
    error: jest.fn().mockReturnValue(null),
    setOrganization: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    reset: jest.fn(),
  };
}

export function createMockAuditLogStore() {
  return {
    logs: jest.fn().mockReturnValue([]),
    total: jest.fn().mockReturnValue(0),
    page: jest.fn().mockReturnValue(1),
    limit: jest.fn().mockReturnValue(20),
    totalPages: jest.fn().mockReturnValue(0),
    filters: jest.fn().mockReturnValue({ dateFrom: '', dateTo: '', action: '', resource: '' }),
    isLoading: jest.fn().mockReturnValue(false),
    error: jest.fn().mockReturnValue(null),
    setLogs: jest.fn(),
    setFilters: jest.fn(),
    resetFilters: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
  };
}

export type MockAuthStore = ReturnType<typeof createMockAuthStore>;
export type MockTaskStore = ReturnType<typeof createMockTaskStore>;
export type MockDepartmentStore = ReturnType<typeof createMockDepartmentStore>;
export type MockUIStore = ReturnType<typeof createMockUIStore>;
export type MockToastService = ReturnType<typeof createMockToastService>;
export type MockAuditLogStore = ReturnType<typeof createMockAuditLogStore>;
