import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { sign, verify } from 'jsonwebtoken';

const JWT_SECRET = 'luddite-launcher-secret-key';
const TOKEN_EXPIRY = '7d'; // Token expires in 7 days

// Login endpoint
export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({
                error: 'Username and password are required'
            }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db('Users');

        const user = await db.collection('users').findOne({ username });

        if (!user || user.password !== password) {
            return NextResponse.json({
                error: 'Invalid username or password'
            }, { status: 401 });
        }

        const payload = {
            sub: user._id.toString(),
            username: user.username,
            // Don't include sensitive info like the password
        };

        const token = sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

        return NextResponse.json({
            success: true,
            token,
            user: {
                username: user.username,
            }
        });

    } catch (error) {
        console.error('Auth Error:', error);
        return NextResponse.json({
            error: 'Authentication failed'
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                error: 'No token provided'
            }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];

        const decoded = verify(token, JWT_SECRET);

        return NextResponse.json({
            success: true,
            user: decoded
        });

    } catch (error) {
        console.error('Token verification error:', error);
        return NextResponse.json({
            error: 'Invalid or expired token'
        }, { status: 401 });
    }
}