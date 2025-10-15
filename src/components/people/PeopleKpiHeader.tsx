import { Users, Mail, Phone, UserPlus } from "lucide-react";
import { EnhancedKpiCard, EnhancedKpiGrid } from "@/components/common/kpi/EnhancedKpiCard";

interface PeopleKpiHeaderProps {
    total: number;
    withEmail: number;
    withPhone: number;
    newThisMonth: number;
}

export function PeopleKpiHeader({ total, withEmail, withPhone, newThisMonth }: PeopleKpiHeaderProps) {
    const emailPercentage = total > 0 ? ((withEmail / total) * 100) : 0;
    const phonePercentage = total > 0 ? ((withPhone / total) * 100) : 0;

    return (
        <EnhancedKpiGrid columns={4}>
            <EnhancedKpiCard
                title="Total People"
                value={total}
                icon={Users}
            />

            <EnhancedKpiCard
                title="With Email"
                value={withEmail}
                subtitle={`${emailPercentage.toFixed(0)}% of total`}
                icon={Mail}
                progress={emailPercentage}
                showProgress={true}
                progressLabel="Email Coverage"
                valueColor={
                    emailPercentage >= 80 ? "text-[#6b7c5e]" :
                    emailPercentage >= 50 ? "text-[#d4a574]" :
                    "text-[#b8695f]"
                }
            />

            <EnhancedKpiCard
                title="With Phone"
                value={withPhone}
                subtitle={`${phonePercentage.toFixed(0)}% of total`}
                icon={Phone}
                progress={phonePercentage}
                showProgress={true}
                progressLabel="Phone Coverage"
                valueColor={
                    phonePercentage >= 80 ? "text-[#6b7c5e]" :
                    phonePercentage >= 50 ? "text-[#d4a574]" :
                    "text-[#b8695f]"
                }
            />

            <EnhancedKpiCard
                title="New This Month"
                value={newThisMonth}
                icon={UserPlus}
            />
        </EnhancedKpiGrid>
    );
}
