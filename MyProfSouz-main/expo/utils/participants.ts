const MANAGER_ROLES = new Set(['admin', 'leader', 'manager', 'lawyer']);

export function getParticipantName(item: any): string {
  return item?.fullName || item?.name || item?.fio || item?.email || 'Без имени';
}

export function getParticipantId(item: any): string {
  return String(item?.id || item?.userId || item?.agentId || item?.memberId || '');
}

export function getParticipantLeaderId(item: any): string {
  return String(
    item?.leaderId ||
    item?.managerId ||
    item?.assignedLeaderId ||
    item?.assignedManagerId ||
    item?.responsibleLeaderId ||
    item?.responsibleManagerId ||
    item?.curatorId ||
    item?.leader?.id ||
    item?.manager?.id ||
    ''
  );
}

export function getParticipantMeta(item: any): string {
  return item?.divisionName || item?.unionName || item?.profession || item?.email || item?.phone || 'Участник';
}

export function getParticipantInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return initials || 'У';
}

export function isAssignableParticipant(item: any): boolean {
  if (!getParticipantId(item)) return false;
  const role = String(item?.role || item?.userRole || item?.type || '').toLowerCase();
  if (MANAGER_ROLES.has(role)) return false;
  if (item?.isLeader || item?.isManager || item?.isAdmin || item?.isLawyer) return false;
  return true;
}

export function uniqParticipants(items: any[]): any[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = getParticipantId(item);
    if (!id || seen.has(id) || !isAssignableParticipant(item)) return false;
    seen.add(id);
    return true;
  });
}

export function withParticipantLeader(item: any, leaderId?: string | null): any {
  return {
    ...item,
    leaderId: leaderId || undefined,
    managerId: leaderId || undefined,
    assignedLeaderId: leaderId || undefined,
    assignedManagerId: leaderId || undefined,
  };
}
