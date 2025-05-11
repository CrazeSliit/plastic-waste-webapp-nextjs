import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    console.log('📥 GET /api/orders - Request received');
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('❌ GET /api/orders - Unauthorized access attempt');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userType = session.user.userType?.toUpperCase() || 'INDIVIDUAL';
    console.log(`👤 User ID: ${userId}, User Type: ${userType}`);
    
    let orders = [];
    let totalCount = 0;
    
    // Different query based on user type
    if (userType === 'COLLECTOR') {
      console.log('🔍 Fetching orders for COLLECTOR user type');
      // For collectors, get orders for their listings
      const collectorListings = await prisma.listing.findMany({
        where: {
          userId: userId
        },
        select: {
          id: true
        }
      });
      
      const listingIds = collectorListings.map(listing => listing.id);
      console.log(`📋 Found ${listingIds.length} listings for collector: ${listingIds.join(', ')}`);
      
      // Log the query we're about to execute
      console.log(`🔍 Querying orders with listingIds: ${JSON.stringify(listingIds)}`);
      
      // Check if there are any orders for these listings directly from the database
      const orderCheck = await prisma.order.findMany({
        where: {
          listingId: {
            in: listingIds
          }
        },
        select: {
          id: true,
          buyerId: true,
          listingId: true
        }
      });
      
      console.log(`🔍 Direct database check found ${orderCheck.length} orders`);
      if (orderCheck.length > 0) {
        console.log(`🔍 Order details: ${JSON.stringify(orderCheck)}`);
      }
      
      // Get all orders for this collector's listings
      orders = await prisma.order.findMany({
        where: {
          listingId: {
            in: listingIds
          }
        },
        include: {
          listing: {
            select: {
              title: true,
              wasteType: true,
              price: true,
              location: true
            }
          },
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              address: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Double check if we got all orders
      console.log(`📊 Found ${orders.length} orders for collector listings`);
      console.log(`🧾 Order IDs: ${orders.map(o => o.id).join(', ')}`);
      
      // Get the total count
      totalCount = await prisma.order.count({
        where: {
          listingId: {
            in: listingIds
          }
        }
      });
      
      // If there's a mismatch, log it
      if (totalCount !== orders.length) {
        console.log(`⚠️ Warning: Total count (${totalCount}) doesn't match orders length (${orders.length})`);
      }
    } else {
      console.log('🔍 Fetching orders for regular user');
      // For regular users, get orders they placed
      orders = await prisma.order.findMany({
        where: {
          buyerId: userId
        },
        include: {
          listing: {
            select: {
              title: true,
              wasteType: true,
              price: true,
              location: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phoneNumber: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      totalCount = await prisma.order.count({
        where: {
          buyerId: userId
        }
      });
      console.log(`📊 Found ${orders.length} orders placed by user`);
    }

    // Log order IDs for debugging
    if (orders.length > 0) {
      console.log('📝 Order IDs:', orders.map(order => order.id));
    } else {
      console.log('⚠️ No orders found');
    }

    console.log('✅ GET /api/orders - Successfully processed request');
    return NextResponse.json({
      success: true,
      orders,
      totalCount
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('📥 POST /api/orders - Request received');
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('❌ POST /api/orders - Unauthorized access attempt');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    console.log(`👤 User ID: ${session.user.id}, User Type: ${session.user.userType}`);
    console.log(`📦 Order data: ${JSON.stringify(data)}`);
    
    // Handle both listingId and productId for backward compatibility
    const listingId = data.listingId || data.productId;
    console.log(`🔍 Looking for listing with ID: ${listingId}`);
    console.log(`🔍 Original request data: ${JSON.stringify(data)}`);
    
    // Check if the ID is valid MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(listingId);
    console.log(`🔍 Is valid ObjectId format: ${isValidObjectId}`);
    
    if (!isValidObjectId) {
      console.log(`❌ Invalid ObjectId format: ${listingId}`);
      return NextResponse.json({ error: "Invalid listing ID format" }, { status: 400 });
    }
    
    // Log all listings for debugging
    const allListings = await prisma.listing.findMany({
      select: { id: true, title: true, userId: true }
    });
    console.log(`🔍 Available listings: ${JSON.stringify(allListings.map(l => ({ id: l.id, title: l.title })))}`);
    
    // Validate the listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, userId: true, title: true }
    });
    
    if (!listing) {
      console.log(`❌ Listing not found: ${listingId}`);
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    
    console.log(`📋 Found listing: ${listing.title} (${listing.id}) owned by user ${listing.userId}`);
    
    // Create the order
    const order = await prisma.order.create({
      data: {
        buyerId: session.user.id,
        listingId: listingId,
        quantity: data.quantity,
        totalPrice: data.totalPrice,
        status: "PENDING",
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            userType: true
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            userId: true
          }
        }
      }
    });
    
    console.log(`✅ Order created successfully: ${order.id}`);
    console.log(`👤 Buyer: ${order.buyer.name} (${order.buyer.userType})`);
    console.log(`📦 Listing: ${order.listing.title} owned by ${order.listing.userId}`);

    return NextResponse.json({
      success: true,
      message: "Order placed successfully",
      order
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
} 