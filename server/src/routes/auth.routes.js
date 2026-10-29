const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const userService = require("../services/userService");
const { signToken, requireAuth } = require("../middleware/auth");
const { validate, z, requiredText } = require("../middleware/validate");
const { asyncHandler, forbidden, notFound } = require("../utils/http");

const router = Router();

// Slows down credential stuffing against the login and register endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later" },
});

const registerSchema = z.object({
  fullName: requiredText("Full name", 100),
  email: requiredText("Email", 150).pipe(z.string().email("Enter a valid email address")),
  mobile: requiredText("Mobile", 20),
  employeeId: requiredText("Employee ID", 50),
  department: requiredText("Department", 100),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

const loginSchema = z.object({
  email: requiredText("Email", 150),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

const profileSchema = z.object({
  fullName: requiredText("Full name", 100),
  mobile: requiredText("Mobile", 20),
  department: requiredText("Department", 100),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(1, "New password is required"),
});

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    await userService.register(req.validated.body);
    res.status(201).json({ success: true, message: "Registration successful" });
  })
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validated.body;
    const user = await userService.authenticate(email, password);
    res.json({ success: true, message: "Login Successful", token: signToken(user), user });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await userService.findById(req.userId);
    if (!user) {
      throw notFound("User not found");
    }
    res.json({ success: true, user });
  })
);

router.put(
  "/users/:id",
  requireAuth,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    // Users may only edit their own profile.
    if (Number(req.params.id) !== req.userId) {
      throw forbidden("You can only update your own profile");
    }
    const user = await userService.updateProfile(req.userId, req.validated.body);
    res.json({ success: true, message: "Profile updated successfully", user });
  })
);

router.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.validated.body;
    await userService.changePassword(req.userId, currentPassword, newPassword);
    res.json({ success: true, message: "Password changed successfully" });
  })
);

module.exports = router;
