const Event = require('../models/Event');
const fs = require('fs');
const path = require('path');
const Boom = require('@hapi/boom');

// Get all events
exports.getAllEvents = async (request, h) => {
  try {
    console.log('Fetching all events');
    const events = await Event.find({ status: 'active' });
    console.log(`Found ${events.length} events`);
    
    return h.response({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return h.response({
      success: false,
      message: error.message || 'Error fetching events'
    }).code(500);
  }
};

// Get single event
exports.getEventById = async (request, h) => {
  try {
    console.log('Fetching event by id:', request.params.id);
    const event = await Event.findById(request.params.id);
    
    if (!event) {
      console.log('Event not found');
      return h.response({
        success: false,
        message: 'Event not found'
      }).code(404);
    }

    console.log('Event found:', event._id);
    return h.response({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return h.response({
      success: false,
      message: error.message || 'Error fetching event'
    }).code(500);
  }
};

// Create new event
exports.createEvent = async (request, h) => {
  try {
    const payload = request.payload;
    console.log('Received payload:', payload);

    // Handle image uploads
    const imagePaths = [];
    if (payload.images) {
      const files = Array.isArray(payload.images) ? payload.images : [payload.images];
      
      // Ensure uploads directory exists
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (const file of files) {
        if (file.hapi) {
          try {
            // Generate unique filename
            const timestamp = Date.now();
            const originalName = file.hapi.filename;
            const extension = path.extname(originalName);
            const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const filepath = path.join(uploadDir, safeName);

            // Save file
            const fileStream = fs.createWriteStream(filepath);
            await new Promise((resolve, reject) => {
              file.pipe(fileStream)
                .on('finish', resolve)
                .on('error', reject);
            });

            // Add file path to images array
            imagePaths.push(`/uploads/${safeName}`);
          } catch (error) {
            console.error('Error saving file:', error);
            throw error;
          }
        }
      }
    }

    // Create event data object
    const eventData = {
      name: payload.name,
      detail: payload.detail,
      price: Number(payload.price),
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      capacity: Number(payload.capacity),
      location: {
        address: payload['location.address'],
        city: payload['location.city'],
        province: payload['location.province']
      },
      status: payload.status || 'active',
      images: imagePaths
    };

    console.log('Creating event with data:', eventData);

    // Create the event
    const event = await Event.create(eventData);
    
    return h.response({
      success: true,
      data: event
    }).code(201);
  } catch (error) {
    console.error('Error creating event:', error);
    return h.response({
      success: false,
      message: error.message
    }).code(400);
  }
};

// Update event
exports.updateEvent = async (request, h) => {
  try {
    const payload = request.payload;
    console.log('Received payload:', payload);

    // Check if event exists
    const event = await Event.findById(request.params.id);
    if (!event) {
      return h.response({
        success: false,
        message: 'Event not found'
      }).code(404);
    }

    // Handle image uploads if any
    let imagePaths = [];
    if (payload.images) {
      const files = Array.isArray(payload.images) ? payload.images : [payload.images];
      
      // Ensure uploads directory exists
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (const file of files) {
        if (file.hapi) {
          try {
            // Generate unique filename
            const timestamp = Date.now();
            const originalName = file.hapi.filename;
            const extension = path.extname(originalName);
            const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const filepath = path.join(uploadDir, safeName);

            // Save file
            const fileStream = fs.createWriteStream(filepath);
            await new Promise((resolve, reject) => {
              file.pipe(fileStream)
                .on('finish', resolve)
                .on('error', reject);
            });

            // Add file path to images array
            imagePaths.push(`/uploads/${safeName}`);
          } catch (error) {
            console.error('Error saving file:', error);
            throw error;
          }
        }
      }
    }

    // Handle remaining images
    let remainingImages = [];
    if (payload.remainingImages) {
      try {
        remainingImages = JSON.parse(payload.remainingImages)
          .map(url => url.replace(`${process.env.API_BASE_URL || 'http://localhost:3000'}`, ''));
      } catch (error) {
        console.error('Error parsing remainingImages:', error);
      }
    }

    // Create event data object
    const eventData = {
      name: payload.name || event.name,
      detail: payload.detail || event.detail,
      price: payload.price ? Number(payload.price) : event.price,
      startDate: payload.startDate ? new Date(payload.startDate) : event.startDate,
      endDate: payload.endDate ? new Date(payload.endDate) : event.endDate,
      capacity: payload.capacity ? Number(payload.capacity) : event.capacity,
      status: payload.status || event.status,
      location: {
        address: payload['location.address'] || event.location.address,
        city: payload['location.city'] || event.location.city,
        province: payload['location.province'] || event.location.province
      },
      images: [...remainingImages, ...imagePaths]
    };

    // Delete removed images from filesystem
    const removedImages = event.images.filter(img => !remainingImages.includes(img));
    for (const imagePath of removedImages) {
      const fullPath = path.join(__dirname, '../..', imagePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          console.log(`Deleted file: ${fullPath}`);
        } catch (error) {
          console.error(`Error deleting file ${fullPath}:`, error);
        }
      }
    }

    console.log('Updating event with data:', eventData);

    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      request.params.id,
      eventData,
      { new: true, runValidators: true }
    );
    
    return h.response({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return h.response({
      success: false,
      message: error.message
    }).code(400);
  }
};

// Delete event
exports.deleteEvent = async (request, h) => {
  try {
    const event = await Event.findById(request.params.id);
    
    if (!event) {
      return h.response({
        success: false,
        message: 'Event not found'
      }).code(404);
    }

    // Delete associated images
    if (event.images && event.images.length > 0) {
      event.images.forEach(imagePath => {
        const fullPath = path.join(__dirname, '../..', imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    await event.deleteOne();

    return h.response({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return h.response({
      success: false,
      message: error.message
    }).code(500);
  }
}; 