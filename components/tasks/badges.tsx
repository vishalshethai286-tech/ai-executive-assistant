export function priorityBadgeVariant(priority: string): "secondary" | "info" | "warning" | "destructive" {
  switch (priority) {
    case "CRITICAL":
      return "destructive";
    case "HIGH":
      return "warning";
    case "MEDIUM":
      return "info";
    default:
      return "secondary";
  }
}

export function statusBadgeVariant(status: string): "secondary" | "info" | "warning" | "success" {
  switch (status) {
    case "DONE":
      return "success";
    case "IN_PROGRESS":
      return "info";
    case "WAITING":
      return "warning";
    default:
      return "secondary";
  }
}

export function followUpStatusBadgeVariant(status: string): "secondary" | "info" | "warning" | "success" | "outline" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "WAITING":
      return "warning";
    case "IGNORED":
      return "outline";
    default:
      return "info";
  }
}
