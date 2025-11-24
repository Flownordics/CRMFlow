import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRelatedTasks } from "@/services/tasks";
import { useUsers } from "@/services/users";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectTeamProps {
  dealId: string;
}

export function ProjectTeam({ dealId }: ProjectTeamProps) {
  const { data: tasks } = useRelatedTasks('deal', dealId);
  const { data: users } = useUsers();

  // Aggregate team members from tasks
  const teamMembers = useMemo(() => {
    if (!tasks || !users) return [];

    const memberMap = new Map<string, {
      user: typeof users[0];
      taskCount: number;
      completedCount: number;
    }>();

    tasks.forEach((task) => {
      if (task.assigned_to) {
        const user = users.find(u => u.id === task.assigned_to);
        if (user) {
          const existing = memberMap.get(task.assigned_to);
          if (existing) {
            existing.taskCount++;
            if (task.status === 'completed') {
              existing.completedCount++;
            }
          } else {
            memberMap.set(task.assigned_to, {
              user,
              taskCount: 1,
              completedCount: task.status === 'completed' ? 1 : 0,
            });
          }
        }
      }
    });

    return Array.from(memberMap.values()).sort((a, b) => b.taskCount - a.taskCount);
  }, [tasks, users]);

  if (!tasks || tasks.length === 0) {
    return null;
  }

  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No team members assigned to tasks yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teamMembers.map((member) => {
            const initials = member.user.name
              ? member.user.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : member.user.email[0].toUpperCase();
            
            const completionRate = member.taskCount > 0
              ? (member.completedCount / member.taskCount) * 100
              : 0;

            return (
              <div
                key={member.user.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {member.user.name || member.user.email}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.taskCount} task{member.taskCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      completionRate >= 80
                        ? "border-success text-success dark:text-success"
                        : completionRate >= 50
                        ? "border-warning text-warning dark:text-warning"
                        : "border-destructive text-destructive dark:text-destructive"
                    )}
                  >
                    {completionRate.toFixed(0)}% done
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

