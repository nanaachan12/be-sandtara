const Event = require('../models/Event');
const { cloudinary } = require('../config/cloudinary');

// Get all events
exports.getAllEvents = async (request, h) => {
  try {
    console.log('Fetching all events');
    const events = await Event.find({}); // Remove status filter since category is optional
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
    console.log('Receiving payload:', payload);

    // Handle image uploads
    const imagePaths = [];
    if (payload.images) {
      const files = Array.isArray(payload.images) ? payload.images : [payload.images];
      
      for (const file of files) {
        if (file.hapi) {
          try {
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'santaratrip/events',
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );

              file.pipe(uploadStream);
            });

            // Add Cloudinary URL to images array
            imagePaths.push(result.secure_url);
          } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw error;
          }
        }
      }
    }

    // Create event data object
    const eventData = {
      name: payload.name,
      description: payload.description,
      images: imagePaths,
      category: payload.category // Optional, will be undefined if not provided
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
    console.log('Receiving payload:', payload);

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
      
      for (const file of files) {
        if (file.hapi) {
          try {
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'santaratrip/events',
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );

              file.pipe(uploadStream);
            });

            // Add Cloudinary URL to images array
            imagePaths.push(result.secure_url);
          } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw error;
          }
        }
      }
    }

    // Handle remaining images
    let remainingImages = [];
    if (payload.remainingImages) {
      try {
        remainingImages = JSON.parse(payload.remainingImages);
      } catch (error) {
        console.error('Error parsing remainingImages:', error);
      }
    }

    // Combine new and remaining images
    const allImages = [...remainingImages, ...imagePaths];

    // Create event data object
    const eventData = {
      name: payload.name || event.name,
      description: payload.description || event.description,
      images: allImages.length > 0 ? allImages : event.images,
      category: payload.category !== undefined ? payload.category : event.category // Preserve existing category if not provided
    };

    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      request.params.id,
      eventData,
      { new: true }
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

    // Delete images from Cloudinary if they exist
    if (event.images && event.images.length > 0) {
      for (const imageUrl of event.images) {
        try {
          // Extract public_id from Cloudinary URL
          const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
          await cloudinary.uploader.destroy(`santaratrip/events/${publicId}`);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

    await Event.findByIdAndDelete(request.params.id);

    return h.response({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return h.response({
      success: false,
      message: error.message
    }).code(400);
  }
};