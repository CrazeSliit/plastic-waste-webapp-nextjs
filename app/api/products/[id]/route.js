import { NextResponse } from "next/server";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    // Return early if this is the create route
    if (id === 'create') {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    let productId;
    try {
      productId = new ObjectId(id);
    } catch (error) {
      console.error('Invalid ObjectId:', id);
      return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 });
    }

    const db = await getDb();
    const product = await db.collection('Product').findOne({ _id: productId });
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get seller information if sellerId exists
    let seller = null;
    if (product.sellerId) {
      // Changed collection name from 'users' to 'User' to be consistent
      seller = await db.collection('User').findOne(
        { _id: new ObjectId(product.sellerId) },
        { projection: { name: 1, userType: 1 } }
      );
    }

    // Format the response
    const formattedProduct = {
      ...product,
      _id: product._id.toString(),
      sellerId: product.sellerId?.toString(),
      seller: seller ? {
        name: seller.name,
        id: seller._id.toString(),
        userType: seller.userType
      } : {
        name: 'Unknown Seller',
        id: null,
        userType: 'unknown'
      },
      createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString()
    };

    return NextResponse.json({ product: formattedProduct });
    
  } catch (error) {
    console.error('Error in GET product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
} 