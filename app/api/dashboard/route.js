import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userType = session.user.userType?.toUpperCase() || 'INDIVIDUAL';

    // Initialize dashboard data
    let dashboardData = {
      collections: [],
      products: [],
      points: 0,
      totalCollections: 0,
      totalProducts: 0,
      totalOrders: 0,
      recentActivity: []
    };

    try {
      // Base query for collections
      const collections = await prisma.collection.findMany({
        where: {
          userId: userId
        },
        select: {
          id: true,
          type: true,
          date: true,
          status: true,
          address: true,
          wasteType: true,
          quantity: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
              phoneNumber: true,
              address: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        take: 5
      });

      // Base query for orders
      const orders = await prisma.order.findMany({
        where: {
          buyerId: userId
        },
        select: {
          id: true,
          status: true,
          totalPrice: true,
          createdAt: true,
          buyer: {
            select: {
              name: true,
              email: true,
              phoneNumber: true,
              address: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });

      // Update base data
      dashboardData.collections = collections || [];
      dashboardData.totalCollections = collections?.length || 0;

      // Add role-specific data
      switch (userType) {
        case 'INDIVIDUAL':
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              points: true
            }
          });
          
          const individualOrders = await prisma.order.count({
            where: { buyerId: userId }
          });

          dashboardData = {
            ...dashboardData,
            points: user?.points || 0,
            totalOrders: individualOrders || 0
          };
          break;

        case 'BUSINESS':
          const businessOrders = await prisma.order.findMany({
            where: { buyerId: userId },
            select: {
              totalPrice: true
            }
          });
          
          dashboardData = {
            ...dashboardData,
            orders: orders || [],
            totalOrders: businessOrders?.length || 0,
            totalSpent: businessOrders?.reduce((sum, order) => 
              sum + (parseFloat(order.totalPrice) || 0), 0) || 0
          };
          break;

        case 'COLLECTOR':
          const collectorProducts = await prisma.product.findMany({
            where: { 
              sellerId: userId
            },
            select: {
              id: true,
              name: true,
              price: true,
              category: true,
              quantity: true,
              inStock: true,
              createdAt: true
            }
          });

          // Get all listings by this collector
          const collectorListings = await prisma.listing.findMany({
            where: {
              userId: userId
            },
            select: {
              id: true
            }
          });

          // Get listing IDs for the query
          const listingIds = collectorListings.map(listing => listing.id);

          // Get orders for those listings
          const collectorOrders = await prisma.order.findMany({
            where: {
              listingId: {
                in: listingIds
              }
            },
            select: {
              id: true,
              status: true,
              totalPrice: true,
              quantity: true,
              createdAt: true,
              listingId: true,
              buyerId: true,
              listing: {
                select: {
                  title: true,
                  wasteType: true,
                  price: true
                }
              },
              buyer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phoneNumber: true,
                  address: true,
                  userType: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          });
          
          // Log the orders for debugging
          console.log(`Found ${collectorOrders.length} orders for collector listings: ${JSON.stringify(listingIds)}`);
          if (collectorOrders.length > 0) {
            console.log('Order IDs:', collectorOrders.map(order => order.id));
            console.log('Buyer IDs:', collectorOrders.map(order => order.buyerId));
            console.log('Listing IDs:', collectorOrders.map(order => order.listingId));
          }
          
          dashboardData = {
            ...dashboardData,
            products: collectorProducts || [],
            orders: collectorOrders || [],
            totalProducts: collectorProducts?.length || 0,
            totalOrders: collectorOrders?.length || 0,
            totalRevenue: collectorOrders?.reduce((sum, order) => 
              sum + (parseFloat(order.totalPrice) || 0), 0) || 0
          };
          break;
      }

      // Format recent activity
      dashboardData.recentActivity = [
        ...(collections?.map(c => ({
          type: 'collection',
          title: `Collection ${(c.status || 'scheduled').toLowerCase()}`,
          description: `${c.wasteType || 'Mixed Waste'} - ${c.quantity || 0}kg`,
          date: c.date ? new Date(c.date).toISOString() : new Date().toISOString()
        })) || []),
        ...(orders?.map(o => ({
          type: 'order',
          title: `Order ${(o.status || 'placed').toLowerCase()}`,
          description: `Order #${o.id}`,
          date: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString()
        })) || [])
      ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

      return NextResponse.json({
        success: true,
        ...dashboardData
      });
    } catch (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
} 