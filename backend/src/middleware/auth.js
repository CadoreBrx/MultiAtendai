const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'multiatendai-dev-secret-change-me';

/**
 * Middleware de autenticação JWT.
 * Injeta req.userId e req.empresaId no request.
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.empresaId = decoded.empresaId;
        req.userRole = decoded.role;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}

/**
 * Gera um token JWT com dados do usuário e empresa.
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authMiddleware, generateToken, JWT_SECRET };
