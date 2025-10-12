import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, Trophy, TrendingUp } from 'lucide-react';
import { SalespersonMetrics } from '@/services/salespersonAnalytics';
import { formatCurrency, formatPercentage } from '@/services/analytics';

interface SalespersonLeaderboardProps {
  salespeople: SalespersonMetrics[];
  onSelectPerson?: (userId: string) => void;
}

type SortKey = keyof SalespersonMetrics;

export function SalespersonLeaderboard({
  salespeople,
  onSelectPerson,
}: SalespersonLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  if (salespeople.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Leaderboard</CardTitle>
          <CardDescription>No salesperson data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedSalespeople = [...salespeople].sort((a, b) => {
    const aValue = a[sortKey] as number;
    const bValue = b[sortKey] as number;
    
    if (sortDirection === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <Badge className="bg-[#d4a574] hover:bg-[#c89563] text-white">
          <Trophy className="h-3 w-3 mr-1" />
          #1
        </Badge>
      );
    } else if (index === 1) {
      return (
        <Badge variant="secondary" className="bg-gray-400">
          #2
        </Badge>
      );
    } else if (index === 2) {
      return (
        <Badge variant="secondary" className="bg-amber-700">
          #3
        </Badge>
      );
    } else {
      return <Badge variant="outline">#{index + 1}</Badge>;
    }
  };

  const SortButton = ({
    column,
    label,
  }: {
    column: SortKey;
    label: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 -ml-3"
      onClick={() => handleSort(column)}
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Team Leaderboard
        </CardTitle>
        <CardDescription>
          Top performers ranked by {sortKey.replace(/([A-Z])/g, ' $1').trim()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Salesperson</TableHead>
              <TableHead className="text-right">
                <SortButton column="totalRevenue" label="Revenue" />
              </TableHead>
              <TableHead className="text-right">
                <SortButton column="wonDeals" label="Deals Won" />
              </TableHead>
              <TableHead className="text-right">
                <SortButton column="winRate" label="Win Rate" />
              </TableHead>
              <TableHead className="text-right">
                <SortButton column="totalActivities" label="Activities" />
              </TableHead>
              <TableHead className="text-right">
                <SortButton column="pipelineValue" label="Pipeline" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSalespeople.map((person, index) => (
              <TableRow
                key={person.userId}
                className={onSelectPerson ? 'cursor-pointer hover:bg-muted' : ''}
                onClick={() => onSelectPerson && onSelectPerson(person.userId)}
              >
                <TableCell>{getRankBadge(index)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(person.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{person.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {person.userEmail}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(person.totalRevenue)}
                  {person.revenueGrowth > 0 && (
                    <div className="text-xs text-success flex items-center justify-end mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {person.revenueGrowth.toFixed(0)}%
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {person.wonDeals}
                  <span className="text-xs text-muted-foreground ml-1">
                    / {person.totalDeals}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      person.winRate >= 50
                        ? 'default'
                        : person.winRate >= 25
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {formatPercentage(person.winRate)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {person.totalActivities}
                  <div className="text-xs text-muted-foreground">
                    {person.callCount}C · {person.emailCount}E ·{' '}
                    {person.meetingCount}M
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(person.pipelineValue)}
                  <div className="text-xs text-muted-foreground">
                    {person.openDeals} deals
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

