"use client";

import { useState, useEffect } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Recycle, Calendar, Award, Truck, ChevronRight, CreditCard, TrendingUp, User, ShoppingBag, Package } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState({
    collections: [],
    products: [],
    points: 0,
    totalCollections: 0,
    totalProducts: 0,
    totalOrders: 0,
    recentActivity: [],
    totalSpent: 0,
    totalRevenue: 0,
    orders: []
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard data');
      }

      setDashboardData({
        collections: data.collections || [],
        products: data.products || [],
        points: data.points || 0,
        totalCollections: data.totalCollections || 0,
        totalProducts: data.totalProducts || 0,
        totalOrders: data.totalOrders || 0,
        recentActivity: data.recentActivity || [],
        totalSpent: data.totalSpent || 0,
        totalRevenue: data.totalRevenue || 0,
        orders: data.orders || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive",
      });
    }
  };

  // Calculate total recycled quantity
  const totalRecycled = dashboardData.collections.reduce(
    (sum, collection) => sum + (parseFloat(collection.quantity) || 0),
    0
  );

  // Calculate total order weight for business users
  const totalOrderWeight = dashboardData.orders.reduce(
    (sum, order) => sum + (parseFloat(order.quantity) || 0),
    0
  );

  const getStatsCards = () => {
    if (!session?.user?.userType) return [];

    switch (session.user.userType) {
      case 'individual':
        return [
          {
            title: "Total Collections",
            value: dashboardData.totalCollections,
            icon: Recycle,
            description: "Scheduled waste collections"
          },
          {
            title: "Points Earned",
            value: dashboardData.points,
            icon: Award,
            description: "Total recycling points"
          },
          {
            title: "Orders Placed",
            value: dashboardData.totalOrders,
            icon: ShoppingBag,
            description: "Products purchased"
          },
          {
            title: "Active Collections",
            value: dashboardData.collections.filter(c => c.status === "SCHEDULED").length,
            icon: Truck,
            description: "Pending collections"
          }
        ];
      case 'business':
        return [
          {
            title: "Total Orders",
            value: dashboardData.totalOrders,
            icon: ShoppingBag,
            description: "Bulk orders placed"
          },
          {
            title: "Active Orders",
            value: dashboardData.orders?.filter(o => o.status === "PENDING").length || 0,
            icon: Package,
            description: "Pending deliveries"
          },
          {
            title: "Total Spent",
            value: `₹${dashboardData.totalSpent || 0}`,
            icon: CreditCard,
            description: "Purchase value"
          },
          {
            title: "Market Trends",
            value: dashboardData.marketTrends || "Stable",
            icon: TrendingUp,
            description: "Price trends"
          }
        ];
      case 'collector':
        return [
          {
            title: "Collections Made",
            value: dashboardData.totalCollections,
            icon: Recycle,
            description: "Total collections"
          },
          {
            title: "Active Requests",
            value: dashboardData.collections.filter(c => c.status === "SCHEDULED").length,
            icon: Truck,
            description: "Pending pickups"
          },
          {
            title: "Products Listed",
            value: dashboardData.totalProducts,
            icon: Package,
            description: "Active listings"
          },
          {
            title: "Total Revenue",
            value: `₹${dashboardData.totalRevenue || 0}`,
            icon: CreditCard,
            description: "Earnings"
          }
        ];
      default:
        return [];
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Container>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button asChild>
          <Link href="/marketplace">Go to Marketplace</Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">Hello, {user?.name || 'User'}!</p>
              <p className="text-sm text-muted-foreground">
                Your account type: {session?.user?.userType || 'Individual'}
              </p>
              <Link href="/profile" className="text-primary hover:underline mt-4 inline-block">
                View Profile <ChevronRight className="inline h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          {/* Reward Points Card */}
          {session?.user?.userType !== 'BUSINESS' && (
            <Card>
              <CardHeader>
                <CardTitle>Reward Points</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{dashboardData.points} pts</p>
                <p className="text-sm text-muted-foreground">Your current balance</p>
                <Link href="/rewards" className="text-primary hover:underline mt-4 inline-block">
                  View Rewards <ChevronRight className="inline h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Impact Card */}
          <Card>
            <CardHeader>
              <CardTitle>Impact</CardTitle>
            </CardHeader>
            <CardContent>
              {session?.user?.userType === 'BUSINESS' ? (
                <>
                  <p className="text-3xl font-bold">{totalOrderWeight.toFixed(1)} kg</p>
                  <p className="text-sm text-muted-foreground">total plastic waste ordered</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold">{totalRecycled.toFixed(1)} kg</p>
                  <p className="text-sm text-muted-foreground">plastic recycled</p>
                </>
              )}
              <Link href="/impact" className="text-primary hover:underline mt-4 inline-block">
                View Impact <ChevronRight className="inline h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {getStatsCards().map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4">
                  {/* Activity type indicator */}
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'collection' ? 'bg-green-500' : 
                    activity.status === 'PENDING' ? 'bg-yellow-500' :
                    activity.status === 'ACCEPTED' ? 'bg-blue-500' :
                    activity.status === 'PAID' ? 'bg-purple-500' :
                    activity.status === 'DELIVERED' ? 'bg-indigo-500' :
                    activity.status === 'COMPLETED' ? 'bg-green-600' :
                    activity.status === 'CANCELLED' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`} />
                  
                  {/* Activity details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{activity.title}</p>
                      {activity.type === 'order' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          activity.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          activity.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                          activity.status === 'PAID' ? 'bg-purple-100 text-purple-800' :
                          activity.status === 'DELIVERED' ? 'bg-indigo-100 text-indigo-800' :
                          activity.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          activity.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    {activity.type === 'order' && session?.user?.userType === 'business' && (
                      <Link 
                        href={`/orders/${activity.orderId}`} 
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        View Order Details
                      </Link>
                    )}
                  </div>
                  
                  {/* Activity date */}
                  <time className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(activity.date).toLocaleDateString()}
                  </time>
                </div>
              ))}
              {dashboardData.recentActivity.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
} 